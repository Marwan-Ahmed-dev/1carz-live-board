'use client';

import { useRouter } from 'next/navigation';
import { addCar } from '@/lib/cars';
import { resolveCarImages, CarImageSlot } from '@/lib/storage';
import { CarForm } from '@/components/admin/CarForm';
import { NewCarInput } from '@/lib/types';
import { useToast } from '@/hooks/useToast';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function NewCarPage() {
  const router = useRouter();
  const { showToast } = useToast();

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
    } catch (imgErr: any) {
      showToast(
        'تم إنشاء العربية لكن فشل رفع الصور. افتح التعديل وأضف الصور مرة أخرى.',
        'error'
      );
      router.push(`/admin/cars/${carId}`);
      return;
    }

    showToast('تم إضافة العربية بنجاح', 'success');
    router.push('/admin/cars');
  };

  return (
    <CarForm
      title="إضافة عربية جديدة"
      submitLabel="إضافة"
      onSave={handleSave}
    />
  );
}
