'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addCar } from '@/lib/cars';
import { resolveCarImages, CarImageSlot } from '@/lib/storage';
import { CarForm } from '@/components/admin/CarForm';
import { NewCarInput } from '@/lib/types';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LoadingState } from '@/components/LoadingState';

export default function InspectorNewCarPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, isAdmin, isInspector, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!isAdmin && !isInspector) {
      router.replace('/cars');
    }
  }, [user, loading, isAdmin, isInspector, router]);

  if (loading || !user || (!isAdmin && !isInspector)) {
    return (
      <div className="min-h-screen bg-admin-bg text-admin-text flex items-center justify-center">
        <LoadingState variant="page" />
      </div>
    );
  }

  const handleSave = async (
    data: NewCarInput,
    imageSlots: CarImageSlot[],
    _removedExistingImages: string[]
  ) => {
    const carId = await addCar({
      ...data,
      image_url: '',
      additional_images: [],
    });

    try {
      const { main, additional } = await resolveCarImages(carId, imageSlots);
      await updateDoc(doc(db, 'cars', carId), {
        image_url: main,
        additional_images: additional,
        updated_at: serverTimestamp(),
      });
    } catch {
      showToast(
        'تم إنشاء العربية لكن فشل رفع الصور. تواصل مع الأدمن لإكمال الصور.',
        'error'
      );
      router.push('/cars');
      return;
    }

    showToast('تم إضافة العربية بنجاح', 'success');
    router.push('/cars');
  };

  return (
    <div className="min-h-screen bg-admin-bg text-admin-text">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <CarForm title="إضافة عربية جديدة" submitLabel="إضافة" onSave={handleSave} />
      </main>
    </div>
  );
}
