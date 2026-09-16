'use client';

import { useRouter } from 'next/navigation';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { addCar } from '@/lib/cars';
import { uploadCarImage } from '@/lib/storage';
import { CarForm } from '@/components/admin/CarForm';
import { NewCarInput } from '@/lib/types';
import { useToast } from '@/hooks/useToast';

export default function NewCarPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const handleSave = async (data: NewCarInput, imageFile: File | null) => {
    // 1. إنشاء العربية أولاً للحصول على ID (بدون image_url)
    const carId = await addCar({ ...data, image_url: '' });

    // 2. رفع الصورة (إذا وُجدت) وتحديث image_url
    if (imageFile) {
      try {
        const imageUrl = await uploadCarImage(imageFile, carId);
        await updateDoc(doc(db, 'cars', carId), {
          image_url: imageUrl,
          updated_at: serverTimestamp(),
        });
      } catch (imgErr: any) {
        // لو الـ upload فشل، نُبقي العربية بدون صورة ونُظهر تحذير
        showToast('تم الحفظ لكن فشل رفع الصورة: ' + (imgErr.message || ''), 'error');
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