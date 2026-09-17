'use client';

import { useRouter } from 'next/navigation';
import { addCar } from '@/lib/cars';
import { uploadCarImage } from '@/lib/storage';
import { CarForm } from '@/components/admin/CarForm';
import { NewCarInput } from '@/lib/types';
import { useToast } from '@/hooks/useToast';

export default function NewCarPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const handleSave = async (
    data: NewCarInput,
    _keptExistingImages: string[],
    newFiles: File[],
    _removedExistingImages: string[]
  ) => {
    // 1. إنشاء العربية أولاً للحصول على ID (بدون صور)
    const carId = await addCar({
      ...data,
      image_url: '',
      additional_images: [],
    });

    // 2. رفع كل الملفات الجديدة (إن وُجدت)
    if (newFiles.length > 0) {
      try {
        const uploadedUrls = await Promise.all(
          newFiles.map((f) => uploadCarImage(f, carId))
        );
        // الأولى = الرئيسية، الباقي = إضافية
        await import('firebase/firestore').then(async ({ doc, serverTimestamp, updateDoc }) => {
          const { db } = await import('@/lib/firebase');
          await updateDoc(doc(db, 'cars', carId), {
            image_url: uploadedUrls[0] || '',
            additional_images: uploadedUrls.slice(1),
            updated_at: serverTimestamp(),
          });
        });
      } catch (imgErr: any) {
        // لو الـ upload فشل، نُبقي العربية بدون صور ونُظهر تحذير
        showToast('تم الحفظ لكن فشل رفع بعض الصور: ' + (imgErr.message || ''), 'error');
      }
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
