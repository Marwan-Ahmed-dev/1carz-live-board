'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { fetchCar } from '@/lib/cars';
import { resolveCarImages, deleteCarImage, extractStoragePath, CarImageSlot } from '@/lib/storage';
import { CarForm } from '@/components/admin/CarForm';
import { NewCarInput, Car } from '@/lib/types';
import { useToast } from '@/hooks/useToast';

export default function EditCarPage({ params }: { params: { id: string } }) {
  // ✅ FIX: Next.js 14 (App Router) بيبعت params كـ plain object — مش Promise.
  // استخدام use() مع object عادي بيكسر React لأن use() hook بيتطلب تكون
  // بنداؤه consistent في كل الـ renders. الحل: destructure مباشرة.
  const router = useRouter();
  const { showToast } = useToast();
  const id = params?.id;
  const [car, setCar] = useState<Car | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('معرّف العربية غير موجود');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const c = await fetchCar(id);
        if (!c) {
          setError('العربية غير موجودة');
        } else {
          setCar(c);
        }
      } catch (err: any) {
        console.error('[EditCarPage] failed to load car:', err);
        setError(err.message || 'فشل تحميل العربية');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSave = async (
    data: NewCarInput,
    imageSlots: CarImageSlot[],
    removedExistingImages: string[]
  ) => {
    if (!car) return;

    let main = '';
    let additional: string[] = [];
    try {
      const resolved = await resolveCarImages(car.id!, imageSlots);
      main = resolved.main;
      additional = resolved.additional;
    } catch (imgErr: any) {
      showToast('فشل رفع بعض الصور: ' + (imgErr.message || ''), 'error');
      throw imgErr;
    }

    if (removedExistingImages.length > 0) {
      Promise.all(
        removedExistingImages.map(async (url) => {
          const path = extractStoragePath(url);
          if (path) {
            try {
              await deleteCarImage(path);
            } catch (e) {
              console.error('Failed to delete removed image:', e);
            }
          }
        })
      ).catch((e) => console.error('Error deleting removed images:', e));
    }

    await updateDoc(doc(db, 'cars', car.id!), {
      ...data,
      image_url: main,
      additional_images: additional,
      updated_at: serverTimestamp(),
    });

    showToast('تم تحديث العربية بنجاح', 'success');
    router.push('/admin/cars');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin text-admin-accent" />
      </div>
    );
  }

  if (error || !car) {
    return (
      <div className="bg-admin-card border border-admin-border rounded-2xl p-8 text-center">
        <h2 className="text-lg font-bold text-admin-text mb-2">{error || 'العربية غير موجودة'}</h2>
        <button
          onClick={() => router.push('/admin/cars')}
          className="px-4 py-2 rounded-xl bg-admin-accent text-admin-bg font-bold text-sm"
        >
          العودة للقائمة
        </button>
      </div>
    );
  }

  return (
    <CarForm
      title={`تعديل: ${car.title}`}
      submitLabel="حفظ التعديلات"
      initial={car}
      onSave={handleSave}
    />
  );
}
