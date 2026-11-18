خطوات التركيب (مرة واحدة بس)

1) ارفعي محتوى المجلد ده على نفس مشروع المنيو ف Vercel (أو استبدلي الملفات ف GitHub لو الموقع مربوط بيه).
   الملفات: index.html, admin.html, menu-default.json, vercel.json, و مجلد api

2) ف Vercel افتحي المشروع > Storage > Create > اختاري Upstash Redis (Free) > اربطيه بالمشروع.
   كده بيتضاف المتغيرات (Environment Variables) لوحدها.

3) ف Settings > Environment Variables ضيفي متغير جديد:
   الاسم: ADMIN_PASSWORD
   القيمة: كلمة السر اللي تختاريها (قوية ومتشاركيهاش)

4) اعملي Redeploy للمشروع.

5) افتحي:  https://menu2-khaki.vercel.app/admin  وادخلي بكلمة السر.

اللينك والـ QR ما بيتغيروش. أي حفظ من لوحة التحكم بيظهر للعملاء فوراً.
