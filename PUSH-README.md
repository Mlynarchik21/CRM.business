# Обновить GitHub и Vercel (если агент Cursor не смог)

Терминал в Cursor иногда **не выполняет** `git push`. Сделайте вручную за 1 минуту.

## Быстрый способ

1. Откройте **PowerShell** (не обязательно в Cursor).
2. Выполните:

```powershell
cd C:\Users\ggmly\studio-crm
powershell -ExecutionPolicy Bypass -File scripts\push-to-github-and-vercel.ps1
```

3. Откройте файл `_push_vercel_report.txt` в корне проекта — там будет результат.

## Если push пишет ошибку авторизации

```powershell
gh auth login
cd C:\Users\ggmly\studio-crm
git push -u origin HEAD
```

Или используйте GitHub Desktop: **Repository → Push origin**.

## Vercel не деплоится

1. Зайдите на https://vercel.com/dashboard  
2. Проект должен быть **подключён** к репозиторию `Mlynarchik21/CRM.business`  
3. Production branch = `main` (или ваша текущая ветка)  
4. После успешного push нажмите **Redeploy** или дождитесь автодеплоя  

Локальный деплой (если есть токен Vercel):

```powershell
cd C:\Users\ggmly\studio-crm
npx vercel deploy --prod
```

## Проверка

- GitHub: https://github.com/Mlynarchik21/CRM.business/commits/main  
- Локально: `git log -1 --oneline` и `git status -sb`
