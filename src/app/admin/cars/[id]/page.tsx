'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { fetchCar } from '@/lib/cars';
import { uploadCarImage, deleteCarImage, extractStoragePath } from '@/lib/storage';
import { CarForm } from '@/components/admin/CarForm';
import { NewCarInput, Car } from '@/lib/types';
import { useToast } from '@/hooks/useToast';

export default function EditCarPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const router = useRouter();
  const { showToast } = useToast();
  // ✅ FIX: بنتعامل مع params سواء كان Promise (Next.js 15) أو object مباشر (Next.js 14)
  // الـ use() بيقبل both — لو object عادي بيرجعه زي ما هو
  const resolvedParams = use(params as any) as { id: string };
  const id = resolvedParams?.id;
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
    keptExistingImages: string[],
    newFiles: File[],
    removedExistingImages: string[]
  ) => {
    if (!car) return;

    // 1. رفع الملفات الجديدة (إن وُجدت)
    const newUploadedUrls: string[] = [];
    if (newFiles.length > 0) {
      try {
        const urls = await Promise.all(newFiles.map((f) => uploadCarImage(f, car.id!)));
        newUploadedUrls.push(...urls);
      } catch (imgErr: any) {
        showToast('فشل رفع بعض الصور: ' + (imgErr.message || ''), 'error');
        throw imgErr;
      }
    }

    // 2. دمج الصور النهائية: existing المُحتفظ بها + الجديدة (بالترتيب)
    // الأولى = الرئيسية، الباقي = إضافية
    const finalImages = [...keptExistingImages, ...newUploadedUrls];
    const finalMain = finalImages[0] || '';
    const finalAdditional = finalImages.slice(1);

    // 3. حذف الصور القديمة اللي المستخدم شالها من Storage
    // (نعملها في الخلفية بدون ما نمنع الحفظ لو فشلت)
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

    // 4. تحديث العربية في Firestore
    await updateDoc(doc(db, 'cars', car.id!), {
      ...data,
      image_url: finalMain,
      additional_images: finalAdditional,
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
