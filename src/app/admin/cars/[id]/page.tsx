'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { fetchCar, updateCar } from '@/lib/cars';
import { uploadCarImage, deleteCarImage, extractStoragePath } from '@/lib/storage';
import { CarForm } from '@/components/admin/CarForm';
import { NewCarInput, Car } from '@/lib/types';
import { useToast } from '@/hooks/useToast';

export default function EditCarPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { id } = use(params);
  const [car, setCar] = useState<Car | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const c = await fetchCar(id);
        if (!c) {
          setError('العربية غير موجودة');
        } else {
          setCar(c);
        }
      } catch (err: any) {
        setError(err.message || 'فشل تحميل العربية');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSave = async (data: NewCarInput, imageFile: File | null) => {
    if (!car) return;

    let imageUrl = data.image_url;

    // إذا تم اختيار صورة جديدة، ارفعها واحذف القديمة
    if (imageFile) {
      try {
        if (car.image_url) {
          // حذف الصورة القديمة
          const oldPath = extractStoragePath(car.image_url);
          if (oldPath) {
            await deleteCarImage(oldPath);
          }
        }
        imageUrl = await uploadCarImage(imageFile, car.id!);
      } catch (imgErr: any) {
        showToast('فشل رفع الصورة: ' + (imgErr.message || ''), 'error');
        throw imgErr;
      }
    }

    await updateCar(car.id!, { ...data, image_url: imageUrl });
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