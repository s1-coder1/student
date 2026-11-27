# Реестр студентов

Локальный серверный реестр с аккаунтами и ролями.

## Запуск в Windows

Чтобы сайт не открывался с ошибкой `ERR_CONNECTION_REFUSED`, запускайте его через `start.bat` из папки проекта. Скрипт проверит, работает ли сервер; если нет — запустит его, дождётся готовности и откроет сайт в браузере. Если сервер уже запущен, скрипт повторно его не запускает.

Не закрывайте свернутое окно Python: пока оно работает, сервер доступен по адресу `http://127.0.0.1:8080`.

### Ручной запуск

Используется Python 3.12 и стандартная библиотека. Дополнительные пакеты не нужны.

```powershell
& "$env:LocalAppData\Programs\Python\Python312\python.exe" app.py
```

Откройте в браузере: `http://127.0.0.1:8080`

При первом запуске создайте аккаунт главного администратора.

## Права

- Главный администратор: полный доступ, список пользователей, выдача прав администратора, установка и смена паролей.
- Администратор: управление студентами, факультетами и группами; просмотр, изменение и удаление нарушений.
- Тьютор: просмотр только назначенных ему групп, их студентов и наличия нарушений; открытие карточки студента с его фото и полной историей нарушений. Группы назначает главный администратор.
- Qalqon: отправка сообщений о нарушениях и просмотр только собственных сообщений.

При регистрации выбирают роль «Тьютор» или «Qalqon». Аккаунт становится доступен после подтверждения главным администратором в разделе пользователей.

Нарушение сохраняется отдельно и связывается с выбранным студентом. Старые нарушения, сохранённые в карточках студентов, переносятся при запуске сервера.

## Данные

SQLite-база находится в `registry.db` рядом с сервером. Пароли хранятся только в виде соль + PBKDF2 SHA-256 хеша. Сессии действуют 12 часов. Сервер предназначен для запуска на доверенном локальном или размещённом сервере.

## Joylashtirish: Netlify + Render + Supabase

Netlify faqat interfeysni joylaydi. Python API Render’da ishlaydi, PostgreSQL bazasi esa Supabase’da saqlanadi. Render bepul servisida API uyqu holatiga o‘tishi mumkin; bazadagi ma’lumotlar bundan ta’sirlanmaydi. Deploy uchun quyidagilar kerak:

1. Supabase loyihasi yarating va **Session pooler** PostgreSQL connection string’ini oling.
2. Kodni `registry.db` faylisiz private GitLab repository’ga joylang. `.gitignore` bazani, `.env` fayllarni va lokal `output/` build katalogini commitdan chiqaradi.
3. Netlify’da ishlatmoqchi bo‘lgan sayt nomini oldindan tanlang. Render’da GitLab repository’sidan Blueprint yarating (`render.yaml`); `DATABASE_URL` uchun Supabase connection string’ini, `ALLOWED_ORIGINS` uchun tanlangan Netlify origin’ini kiriting (`https://sayt-nomi.netlify.app`).
4. Render service URL’ini oling. Netlify’da shu repository’ni ulang va build environment’ga `RENDER_EXTERNAL_URL` nomi bilan Render URL’ini kiriting. Build sozlamalari `netlify.toml` orqali o‘qiladi.
5. Supabase’da yangi bo‘sh baza tayyor bo‘lgach, mahalliy bazaning zaxira nusxasini yarating va PowerShell’da migratsiya skriptini ishga tushiring:

   ```powershell
   python -m pip install -r requirements.txt
   python scripts/migrate_sqlite_to_postgres.py --dry-run
   $env:DATABASE_URL = "Supabase Session pooler connection string"
   python scripts/migrate_sqlite_to_postgres.py
   Remove-Item Env:DATABASE_URL
   ```

Migratsiya faqat bo‘sh PostgreSQL bazasiga yozadi; mavjud bazani ustidan yozmaydi. Mahalliy `registry.db` fayli o‘zgarmaydi. Parollar va o‘quvchi ma’lumotlari mahalliy kompyuteringizdan Supabase’ga to‘g‘ridan-to‘g‘ri yuboriladi; connection string’ni GitLab’ga joylamang. Eski formatda talaba yozuvlari ichida saqlangan buzilishlar ham alohida jadvalga ko‘chiriladi. Ko‘chirishdan keyin foydalanuvchilar qayta tizimga kiradi.

Render’da `ALLOWED_ORIGINS` qiymatini Netlify saytingizning aniq HTTPS origin’i bilan to‘ldiring. Netlify build jarayoni `RENDER_EXTERNAL_URL` orqali `/api/*` so‘rovlarini Render’ga proksi qiladi.
