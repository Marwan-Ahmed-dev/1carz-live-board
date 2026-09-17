import { redirect } from 'next/navigation';

/** المسار القديم كان بيفتح صفحة منفصلة — عربياتنا بقت مستوى أولوية على الصفحة الرئيسية */
export default function ArabyatnaRedirectPage() {
  redirect('/');
}