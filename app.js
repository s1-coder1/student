(function () {
  "use strict";

  var currentUser = null;
  var authMode = "login";
  var language = "ru";
  var darkTheme = false;
  var students = [];
  var faculties = [];
  var users = [];
  var tutorGroups = [];
  var activeTutorStudents = null;
  var reportableStudents = [];
  var violations = [];
  var editingId = null;
  var editingViolationId = null;
  var currentViolationAttachment = null;
  var photoData = "";
  var structureType = "faculty";
  var structureFacultyId = null;
  var passwordUserId = null;
  var passwordAction = "password";

  var languageMap = {
    "Реестр студентов":"Talabalar reyestri",
    "Студенты":"Talabalar",
    "Мои группы":"Guruhlarim",
    "Факультеты и группы":"Fakultetlar va guruhlar",
    "Пользователи":"Foydalanuvchilar",
    "Нарушения":"Qoidabuzarliklar",
    "Выйти":"Chiqish",
    "Вход в реестр":"Reyestrga kirish",
    "Регистрация пользователя":"Foydalanuvchini roʻyxatdan oʻtkazish",
    "Используйте логин и пароль":"Login va paroldan foydalaning",
    "Используйте предоставленный логин и пароль":"Berilgan login va paroldan foydalaning",
    "Вход":"Kirish",
    "Регистрация":"Roʻyxatdan oʻtish",
    "ФИО":"F.I.Sh.",
    "Роль":"Rol",
    "Выберите роль":"Rolni tanlang",
    "Тьютор":"Tyutor",
    "Qalqon":"Qalqon",
    "Логин":"Login",
    "Пароль":"Parol",
    "Зарегистрироваться":"Roʻyxatdan oʻtish",
    "Войти":"Tizimga kirish",
    "Создание главного администратора":"Bosh administrator yaratish",
    "Это единственный первый аккаунт с правом управления пользователями":"Bu foydalanuvchilarni boshqarish huquqiga ega birinchi va yagona akkaunt",
    "Создать администратора":"Administrator yaratish",
    "Работа тьютора":"Tyutor ishi",
    "Выберите группу, чтобы увидеть студентов и наличие нарушений":"Talabalar va qoidabuzarliklar holatini koʻrish uchun guruhni tanlang",
    "Выберите студента, чтобы открыть его фото и историю нарушений":"Talabaning surati va qoidabuzarliklar tarixini koʻrish uchun uni tanlang",
    "Все группы":"Barcha guruhlar",
    "Студент":"Talaba",
    "Записей пока нет":"Hozircha yozuvlar yoʻq",
    "Добавьте первого студента.":"Birinchi talabani qoʻshing.",
    "Сведения о студентах университета и форме обучения":"Universitet talabalari va taʼlim shakli haqidagi maʼlumotlar",
    "Добавить студента":"Talaba qoʻshish",
    "Всего студентов":"Jami talabalar",
    "Обучаются на гранте":"Grant asosida oʻqiydi",
    "Контракт и супер-контракт":"Kontrakt va super-kontrakt",
    "Список студентов":"Talabalar roʻyxati",
    "Поиск по имени, факультету или группе":"Ism, fakultet yoki guruh boʻyicha qidirish",
    "Все формы обучения":"Barcha taʼlim shakllari",
    "Контракт":"Kontrakt",
    "Супер-контракт":"Super-kontrakt",
    "Грант":"Grant",
    "Факультет":"Fakultet",
    "Группа":"Guruh",
    "Форма обучения":"Taʼlim shakli",
    "Дата рождения":"Tugʻilgan sana",
    "Структура университета":"Universitet tuzilmasi",
    "Управляйте списками, доступными при оформлении студентов":"Talabalarni roʻyxatga olishda ishlatiladigan roʻyxatlarni boshqaring",
    "Добавить факультет":"Fakultet qoʻshish",
    "Управление доступом":"Kirish huquqlarini boshqarish",
    "Зарегистрированные пользователи":"Roʻyxatdan oʻtgan foydalanuvchilar",
    "Только главный администратор может выдавать права и менять пароли":"Huquqlarni faqat bosh administrator berishi va parollarni oʻzgartirishi mumkin",
    "Обращения":"Murojaatlar",
    "Сообщите о нарушении и привяжите его к студенту.":"Qoidabuzarlik haqida xabar bering va uni talabaga biriktiring.",
    "Студенты и количество нарушений":"Talabalar va qoidabuzarliklar soni",
    "Поиск по студенту, факультету или группе":"Talaba, fakultet yoki guruh boʻyicha qidirish",
    "По вашему запросу студенты не найдены.":"Qidiruv boʻyicha talabalar topilmadi.",
    "Сообщить о нарушении":"Qoidabuzarlik haqida xabar berish",
    "Описание нарушения *":"Qoidabuzarlik tavsifi *",
    "Прикрепить документ или фото":"Hujjat yoki surat biriktirish",
    "Файл не выбран (до 2 МБ)":"Fayl tanlanmagan (2 MB gacha)",
    "Отмена":"Bekor qilish",
    "Отправить нарушение":"Qoidabuzarlikni yuborish",
    "Список нарушений":"Qoidabuzarliklar roʻyxati",
    "Карточка студента":"Talaba kartasi",
    "История нарушений":"Qoidabuzarliklar tarixi",
    "История всех нарушений":"Barcha qoidabuzarliklar tarixi",
    "Дата: ":"Sana: ",
    "Сообщил: ":"Xabar bergan: ",
    "Добавил: ":"Kiritgan: ",
    "Нарушений у студента нет.":"Talabada qoidabuzarlik yoʻq.",
    "Нарушений пока нет.":"Hozircha qoidabuzarliklar yoʻq.",
    "Загрузка истории нарушений...":"Qoidabuzarliklar tarixi yuklanmoqda...",
    "Открыть карточку студента":"Talaba kartasini ochish",
    "Поиск по студенту":"Talaba boʻyicha qidirish",
    "Изменить":"Oʻzgartirish",
    "Удалить":"Oʻchirish",
    "Сохранить данные":"Maʼlumotlarni saqlash",
    "Имя *":"Ism *",
    "Фамилия *":"Familiya *",
    "Пол *":"Jinsi *",
    "Выберите":"Tanlang",
    "Мужской":"Erkak",
    "Женский":"Ayol",
    "Заполните сведения для реестра":"Reyestr uchun maʼlumotlarni toʻldiring",
    "Выбрать фотографию":"Surat tanlash",
    "Поддерживаемое браузером изображение, до 5 МБ":"Brauzer qoʻllaydigan rasm, 5 MB gacha",
    "Данные защищённо сохраняются на сервере и доступны после входа в систему.":"Maʼlumotlar serverda xavfsiz saqlanadi va tizimga kirgandan soʻng ochiladi.",
    "Система учёта студентов · Для служебного использования":"Talabalarni hisobga olish tizimi · Xizmatda foydalanish uchun",
    "Выберите факультет":"Fakultetni tanlang",
    "Выберите группу":"Guruhni tanlang",
    "Выберите студента":"Talabani tanlang",
    "Выберите факультет, группу, студента и введите описание нарушения.":"Fakultet, guruh va talabani tanlang, qoidabuzarlik tavsifini kiriting.",
    "Прикрепите PDF, DOC, DOCX, JPG, PNG или WebP размером до 2 МБ.":"2 MB gacha boʻlgan PDF, DOC, DOCX, JPG, PNG yoki WebP faylini biriktiring.",
    "Нельзя удалить группу: у студентов есть эта группа.":"Guruhni oʻchirib boʻlmaydi: unga talabalar biriktirilgan.",
    "Требуется вход в систему.":"Tizimga kirish talab qilinadi.",
    "Недостаточно прав.":"Huquqlar yetarli emas.",
    "Автор не указан":"Muallif koʻrsatilmagan",
    "Ожидает подтверждения":"Tasdiqlash kutilmoqda",
    "Университет · Учёт студентов":"Universitet · Talabalar hisobi",
    "Информационная система управления данными":"Maʼlumotlarni boshqarish axborot tizimi",
    "Учебный отдел":"Oʻquv boʻlimi",
    "В этой группе пока нет студентов.":"Bu guruhda hozircha talabalar yoʻq.",
    "Группы пока не назначены":"Hozircha guruhlar biriktirilmagan",
    "Обратитесь к главному администратору.":"Bosh administratorga murojaat qiling.",
    "Есть (":"Bor (",
    "Нет":"Yoʻq",
    "Фото студента":"Talaba surati",
    "Изображение не поддерживается браузером":"Rasmni brauzer ochib bera olmaydi",
    "Фото нарушения":"Qoidabuzarlik rasmi",
    "Вложение недоступно":"Biriktirilgan fayl mavjud emas",
    "Групп не добавлено":"Guruhlar qoʻshilmagan",
    "групп":"guruh",
    "Нарушений: ":"Qoidabuzarliklar: ",
    "Нарушений:":"Qoidabuzarliklar:",
    "Запись удалена":"Yozuv oʻchirildi",
    "Нарушение удалено":"Qoidabuzarlik oʻchirildi",
    "Нарушение обновлено":"Qoidabuzarlik yangilandi",
    "Нарушение отправлено":"Qoidabuzarlik yuborildi",
    "Данные студента обновлены":"Talaba maʼlumotlari yangilandi",
    "Студент добавлен":"Talaba qoʻshildi",
    "Выберите изображение размером до 5 МБ.":"5 MB gacha boʻlgan rasmni tanlang.",
    "Не удалось открыть это изображение в браузере.":"Bu rasmni brauzerda ochib boʻlmadi.",
    "Не удалось прочитать изображение.":"Rasmni oʻqib boʻlmadi.",
    "Не удалось прочитать вложение.":"Biriktirilgan faylni oʻqib boʻlmadi.",
    "Введите название.":"Nom kiriting.",
    "Факультетов пока нет":"Hozircha fakultetlar yoʻq",
    "Добавьте первый факультет.":"Birinchi fakultetni qoʻshing.",
    "Группы не добавлены":"Guruhlar qoʻshilmagan",
    "Факультет появится в карточке студента":"Fakultet talaba kartasida koʻrinadi",
    "Группа будет привязана к факультету":"Guruh fakultetga biriktiriladi",
    "Название факультета *":"Fakultet nomi *",
    "Название группы *":"Guruh nomi *",
    "Название *":"Nomi *",
    "групп.":"guruh.",
    "Добавить группу":"Guruh qoʻshish",
    "Удалить факультет":"Fakultetni oʻchirish",
    "Удалить запись студента «":"« talaba yozuvini oʻchirish",
    "Удалить нарушение студента «":"« talabaning qoidabuzarligini oʻchirish",
    "Добавлено: ":"Qoʻshdi: ",
    "Изменить данные":"Maʼlumotlarni oʻzgartirish",
    "Редактировать данные":"Maʼlumotlarni tahrirlash",
    "Изменить пароль":"Parolni oʻzgartirish",
    "Новый пароль *":"Yangi parol *",
    "Пароль получит пользователь при следующем входе":"Foydalanuvchi parolni keyingi kirishida oladi",
    "Сохранить пароль":"Parolni saqlash",
    "Отозвать права":"Huquqlarni bekor qilish",
    "Подтвердить":"Tasdiqlash",
    "Выдать права администратора":"Administrator huquqlarini berish",
    "Сохранить группы":"Guruhlarni saqlash",
    "Открыть карточку и историю нарушений":"Talaba kartasi va qoidabuzarliklar tarixini ochish",
    "Открыть карточку студента ":"Talaba kartasini ochish: ",
    "Закрыть":"Yopish",
    "Сначала добавьте группы в разделе «Факультеты и группы».":"Avval «Fakultetlar va guruhlar» boʻlimida guruhlarni qoʻshing.",
    "Права администратора выданы":"Administrator huquqlari berildi",
    "Пароль изменён":"Parol oʻzgartirildi",
    "Аккаунт подтверждён":"Akkaunt tasdiqlandi",
    "Группы тьютору назначены":"Tyutorga guruhlar biriktirildi",
    "Права администратора отозваны":"Administrator huquqlari bekor qilindi",
    "Отозвать права администратора у «":"« foydalanuvchisidan administrator huquqlarini bekor qilasizmi?",
    "Дата рождения не может быть в будущем.":"Tugʻilgan sana kelajakda boʻlishi mumkin emas.",
    "Заполните все обязательные поля.":"Barcha majburiy maydonlarni toʻldiring.",
    "Удалить факультет и все его группы?":"Fakultet va unga tegishli barcha guruhlar oʻchirilsinmi?",
    "Сохранить изменения":"Oʻzgarishlarni saqlash",
    "Включить дневной режим":"Kunduzgi rejimni yoqish",
    "Включить ночной режим":"Tungi rejimni yoqish",
    "Главный администратор":"Bosh administrator",
    "Администратор":"Administrator",
    "Пользователь":"Foydalanuvchi",
    "группы тьютора (":"tyutor guruhlari (",
    "Группы тьютора (":"Tyutor guruhlari (",
    "Фото":"Surat",
    "Сохранить":"Saqlash"
  };

  function localizedText(value) {
    var text = String(value);
    if (language === "uz") {
      if (Object.prototype.hasOwnProperty.call(languageMap, text)) return languageMap[text];
      var sourceKeys = Object.keys(languageMap).sort(function (a, b) { return b.length - a.length; });
      for (var index = 0; index < sourceKeys.length; index += 1) {
        if ((sourceKeys[index].endsWith(" ") || sourceKeys[index].endsWith("(")) && text.indexOf(sourceKeys[index]) === 0) {
          return languageMap[sourceKeys[index]]+text.slice(sourceKeys[index].length);
        }
      }
      return text;
    }
    if (language === "ru") {
      var source = Object.keys(languageMap).find(function (key) { return languageMap[key] === text; });
      if (source) return source;
      var translatedKeys = Object.keys(languageMap).sort(function (a, b) { return languageMap[b].length - languageMap[a].length; });
      for (var translatedIndex = 0; translatedIndex < translatedKeys.length; translatedIndex += 1) {
        var translated = languageMap[translatedKeys[translatedIndex]];
        if ((translated.endsWith(" ") || translated.endsWith("(")) && text.indexOf(translated) === 0) {
          return translatedKeys[translatedIndex]+text.slice(translated.length);
        }
      }
    }
    return text;
  }

  function localizeTree(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      var localized = localizedText(root.textContent);
      if (localized !== root.textContent) root.textContent = localized;
      return;
    }
    if (root.nodeType !== 1 && root.nodeType !== 9) return;
    if (root.nodeType === 1) {
      ["placeholder","title","aria-label"].forEach(function (name) {
        if (root.hasAttribute(name)) {
          var value = root.getAttribute(name);
          var localizedValue = localizedText(value);
          if (localizedValue !== value) root.setAttribute(name, localizedValue);
        }
      });
    }
    Array.prototype.slice.call(root.childNodes).forEach(localizeTree);
  }

  function applyPreferences() {
    document.documentElement.lang = language === "uz" ? "uz-Latn" : "ru";
    document.documentElement.classList.toggle("theme-dark", darkTheme);
    document.title = localizedText("Реестр студентов");
    localizeTree(document.body);
    var languageButton = document.getElementById("languageToggle");
    var themeButton = document.getElementById("themeToggle");
    if (languageButton) {
      languageButton.textContent = language === "ru" ? "OʻZ" : "РУС";
      languageButton.title = language === "ru" ? "Oʻzbekcha" : "Русский";
    }
    if (themeButton) {
      themeButton.textContent = darkTheme ? "☀" : "☾";
      themeButton.title = darkTheme
        ? (language === "uz" ? "Kunduzgi rejimni yoqish" : "Включить дневной режим")
        : (language === "uz" ? "Tungi rejimni yoqish" : "Включить ночной режим");
    }
    if (currentUser) {
      if (currentUser.role === "tutor") {
        renderTutorGroups();
        if (activeTutorStudents) renderTutorStudents();
      } else {
        if (currentUser.role !== "qalqon") {
          renderStudents();
          renderFaculties();
        }
        renderViolations();
      }
    }
  }

  try {
    language = localStorage.getItem("student-registry-language") === "uz" ? "uz" : "ru";
    darkTheme = localStorage.getItem("student-registry-theme") === "dark";
  } catch (error) {
    language = "ru";
    darkTheme = false;
    console.warn("Could not read saved display preferences.", error);
  }

  document.getElementById("languageToggle").addEventListener("click", function () {
    language = language === "ru" ? "uz" : "ru";
    try { localStorage.setItem("student-registry-language", language); }
    catch (error) { console.warn("Could not save the selected language.", error); }
    applyPreferences();
  });
  document.getElementById("themeToggle").addEventListener("click", function () {
    darkTheme = !darkTheme;
    try { localStorage.setItem("student-registry-theme", darkTheme ? "dark" : "light"); }
    catch (error) { console.warn("Could not save the selected theme.", error); }
    applyPreferences();
  });

  var languageObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === "characterData") localizeTree(mutation.target);
      else mutation.addedNodes.forEach(localizeTree);
    });
  });
  languageObserver.observe(document.body, {subtree:true,childList:true,characterData:true});

  var authView = document.getElementById("authView");
  var appView = document.getElementById("appView");
  var authForm = document.getElementById("authForm");
  var toastTimer = null;

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char];
    });
  }

  function imageMarkup(source, fallback, alt) {
    return source
      ? '<img src="'+escapeHtml(source)+'" alt="'+escapeHtml(alt || "")+'" data-fallback="'+escapeHtml(fallback)+'">'
      : escapeHtml(fallback);
  }

  document.addEventListener("error", function (event) {
    var image = event.target;
    if (image.tagName === "IMG" && image.hasAttribute("data-fallback")) {
      image.parentNode.replaceChild(document.createTextNode(image.dataset.fallback), image);
    }
  }, true);

  async function api(path, options) {
    options = options || {};
    options.credentials = "same-origin";
    options.headers = options.headers || {};
    if (options.body && typeof options.body === "string") {
      options.headers["Content-Type"] = "application/json";
    }
    var response = await fetch(path, options);
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(payload.error || "Ошибка сервера.");
    return payload;
  }

  function showToast(message) {
    var toast = document.getElementById("toast");
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; }, 2800);
  }

  function showAuth(mode) {
    authMode = mode;
    document.querySelectorAll(".auth-tab").forEach(function (button) {
      button.classList.toggle("active", button.dataset.auth === mode);
    });
    document.getElementById("fullNameField").hidden = mode !== "register";
    document.getElementById("accountTypeField").hidden = mode !== "register";
    document.getElementById("accountType").required = mode === "register";
    document.getElementById("authTitle").textContent = mode === "register" ? "Регистрация пользователя" : "Вход в реестр";
    document.getElementById("authSubtitle").textContent = mode === "register" ? "Выберите роль и дождитесь подтверждения администратора" : "Используйте логин и пароль";
    document.getElementById("authSubmit").textContent = mode === "register" ? "Зарегистрироваться" : "Войти";
    document.getElementById("authError").textContent = "";
    document.getElementById("authNotice").hidden = true;
  }

  async function bootstrap() {
    try {
      var status = await api("/api/bootstrap-status");
      if (status.needsBootstrap) {
        authMode = "bootstrap";
        authView.hidden = false;
        appView.hidden = true;
        document.getElementById("authTabs").hidden = true;
        document.getElementById("fullNameField").hidden = false;
        document.getElementById("authTitle").textContent = "Создание главного администратора";
        document.getElementById("authSubtitle").textContent = "Это единственный первый аккаунт с правом управления пользователями";
        document.getElementById("authSubmit").textContent = "Создать администратора";
      } else {
        var me = await api("/api/me");
        if (me.authenticated) {
          await enterApp(me.user);
        } else {
          authView.hidden = false;
          appView.hidden = true;
          showAuth("login");
        }
      }
    } catch (error) {
      document.getElementById("authError").textContent = error.message;
    }
  }

  document.querySelectorAll(".auth-tab").forEach(function (button) {
    button.addEventListener("click", function () { showAuth(button.dataset.auth); });
  });

  authForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    var errorElement = document.getElementById("authError");
    errorElement.textContent = "";
    var username = document.getElementById("authUsername").value.trim();
    var password = document.getElementById("authPassword").value;
    var fullName = document.getElementById("authFullName").value.trim();
    try {
      var payload = authMode === "register"
        ? await api("/api/register", {method:"POST",body:JSON.stringify({username:username,password:password,fullName:fullName,accountType:document.getElementById("accountType").value})})
        : authMode === "bootstrap"
          ? await api("/api/bootstrap", {method:"POST",body:JSON.stringify({username:username,password:password,fullName:fullName})})
          : await api("/api/login", {method:"POST",body:JSON.stringify({username:username,password:password})});
      if (authMode === "register") {
        authForm.reset();
        showAuth("login");
        document.getElementById("authNotice").textContent = payload.message;
        document.getElementById("authNotice").hidden = false;
        return;
      }
      var me = await api("/api/me");
      await enterApp(me.user);
    } catch (error) {
      errorElement.textContent = error.message;
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", async function () {
    await api("/api/logout", {method:"POST",body:"{}"});
    location.reload();
  });

  async function enterApp(user) {
    currentUser = user;
    document.querySelector(".top-actions").insertBefore(
      document.querySelector(".display-preferences"),
      document.getElementById("logoutBtn")
    );
    authView.hidden = true;
    appView.hidden = false;
    document.getElementById("currentUserName").textContent = user.fullName;
    document.getElementById("currentUserRole").textContent = roleLabel(user.role);
    document.getElementById("currentUserInitial").textContent = user.fullName.charAt(0).toUpperCase();
    var isTutor = user.role === "tutor";
    var isQalqon = user.role === "qalqon";
    document.getElementById("studentsTab").hidden = isTutor || isQalqon;
    document.getElementById("tutorTab").hidden = !isTutor;
    document.getElementById("facultiesTab").hidden = isTutor || isQalqon;
    document.getElementById("usersTab").hidden = user.role !== "main_admin";
    document.getElementById("violationsTab").hidden = isTutor;
    configureViolationForm();
    setActiveView(isTutor ? "tutorView" : isQalqon ? "violationsView" : "studentsView");
    await refreshAll();
    startViolationPolling();
  }

  function configureViolationForm() {
    var formCard = document.querySelector(".violation-form-card");
    if (formCard) formCard.hidden = currentUser.role !== "qalqon";
  }

  function roleLabel(role) {
    return role === "main_admin" ? "Главный администратор"
      : role === "admin" ? "Администратор"
      : role === "tutor" ? "Тьютор"
      : role === "qalqon" ? "Qalqon"
      : "Пользователь";
  }

  var violationPollingTimer = null;
  function startViolationPolling() {
    if (violationPollingTimer) clearInterval(violationPollingTimer);
    if (currentUser.role === "tutor") return;
    violationPollingTimer = setInterval(async function () {
      if (!appView.hidden) {
        try {
          await loadViolations();
        } catch (error) {
          // The next poll will retry; do not replace the active view with an auth error.
        }
      }
    }, 5000);
  }

  async function refreshAll() {
    if (currentUser.role === "tutor") {
      await loadTutorGroups();
      return;
    }
    if (currentUser.role === "qalqon") {
      await Promise.all([loadReportableStudents(), loadViolations()]);
      return;
    }
    await Promise.all([loadStudents(), loadFaculties(), loadReportableStudents(), loadViolations()]);
    if (currentUser.role === "main_admin") await loadUsers();
  }

  async function loadStudents() {
    var payload = await api("/api/students");
    students = payload.students;
    renderStudents();
  }

  async function loadFaculties() {
    var payload = await api("/api/faculties");
    faculties = payload.faculties;
    renderFaculties();
    if (currentUser && currentUser.role === "main_admin") renderUsers();
  }

  async function loadUsers() {
    var payload = await api("/api/admin/users");
    users = payload.users;
    renderUsers();
  }

  async function loadTutorGroups() {
    var payload = await api("/api/tutor/groups");
    tutorGroups = payload.groups;
    renderTutorGroups();
  }

  function renderTutorGroups() {
    var list = document.getElementById("tutorGroupCards");
    if (!tutorGroups.length) {
      list.innerHTML = '<div class="faculty-empty"><strong>Группы пока не назначены</strong>Обратитесь к главному администратору.</div>';
      return;
    }
    list.innerHTML = tutorGroups.map(function (group, index) {
      return '<button class="tutor-group-card" type="button" data-tutor-group="'+index+'"><span class="tutor-group-name">'+escapeHtml(group.group)+'</span><span class="tutor-group-meta">'+escapeHtml(group.faculty)+' · '+group.studentCount+' '+(language === "uz" ? "talaba" : "студентов")+'</span></button>';
    }).join("");
  }

  async function openTutorGroup(index) {
    var group = tutorGroups[index];
    if (!group) return;
    var query = "?faculty="+encodeURIComponent(group.faculty)+"&group="+encodeURIComponent(group.group);
    var payload = await api("/api/tutor/students"+query);
    document.getElementById("tutorGroupsPanel").hidden = true;
    document.getElementById("tutorGroupStudentsPanel").hidden = false;
    document.getElementById("tutorSelectedGroup").textContent = group.group+" · "+group.faculty;
    activeTutorStudents = payload.students;
    renderTutorStudents();
  }

  function renderTutorStudents() {
    var tutorStudents = activeTutorStudents || [];
    document.getElementById("tutorStudentRows").innerHTML = tutorStudents.map(function (student) {
      var count = Number(student.violationCount || 0);
      var status = count
        ? '<span class="violation-status has">'+(language === "uz" ? "Bor (" : "Есть (")+count+')</span>'
        : '<span class="violation-status none">'+(language === "uz" ? "Yoʻq" : "Нет")+'</span>';
      var initials = ((student.firstName||"").charAt(0)+(student.lastName||"").charAt(0)).toUpperCase();
      return '<tr><td><button class="tutor-student-open" type="button" title="Открыть карточку и историю нарушений" aria-label="Открыть карточку студента '+escapeHtml(student.lastName+" "+student.firstName)+'" data-tutor-student="'+escapeHtml(student.id)+'"><span class="person-photo tutor-student-photo">'+escapeHtml(initials)+'</span><span class="person-name">'+escapeHtml(student.lastName+" "+student.firstName)+'</span></button></td><td>'+status+'</td></tr>';
    }).join("");
    document.getElementById("tutorStudentTable").hidden = tutorStudents.length === 0;
    document.getElementById("tutorStudentEmpty").hidden = tutorStudents.length !== 0;
  }

  async function openTutorStudentDetails(studentId) {
    var modal = document.getElementById("tutorStudentDetailsModal");
    var profile = document.getElementById("tutorStudentProfile");
    var history = document.getElementById("tutorViolationHistory");
    document.getElementById("tutorDetailsError").textContent = "";
    document.getElementById("tutorDetailsTitle").textContent = "Карточка студента";
    profile.innerHTML = "";
    history.innerHTML = '<div class="violation-empty">Загрузка истории нарушений...</div>';
    modal.hidden = false;
    try {
      var payload = await api("/api/tutor/students/"+encodeURIComponent(studentId)+"/violations");
      var student = payload.student;
      var initials = ((student.firstName||"").charAt(0)+(student.lastName||"").charAt(0)).toUpperCase();
      var photo = imageMarkup(student.photo, initials, "Фото студента");
      profile.innerHTML = '<div class="person-photo tutor-profile-photo">'+photo+'</div><div><div class="person-name">'+escapeHtml(student.lastName+" "+student.firstName)+'</div><div class="person-meta">'+escapeHtml(student.faculty+" · "+student.group)+'</div></div>';
      document.getElementById("tutorDetailsTitle").textContent = student.lastName+" "+student.firstName;
      if (!payload.violations.length) {
        history.innerHTML = '<div class="violation-empty">Нарушений у студента нет.</div>';
        return;
      }
      history.innerHTML = payload.violations.map(function (violation) {
        var date = violation.createdAt ? new Date(violation.createdAt).toLocaleString(language === "uz" ? "uz-UZ" : "ru-RU") : "";
        var attachment = "";
        var attachmentType = violation.attachment && typeof violation.attachment.type === "string"
          ? violation.attachment.type
          : "";
        if (violation.attachment && attachmentType.indexOf("image/") === 0) {
          attachment = '<a class="violation-evidence" href="'+escapeHtml(violation.attachment.data)+'" target="_blank" rel="noopener">'+imageMarkup(violation.attachment.data, "Изображение не поддерживается браузером", "Фото нарушения")+'</a>';
        } else if (violation.attachment && violation.attachment.data && violation.attachment.name) {
          attachment = '<a class="violation-attachment" href="'+escapeHtml(violation.attachment.data)+'" download="'+escapeHtml(violation.attachment.name)+'">📎 '+escapeHtml(violation.attachment.name)+'</a>';
        } else if (violation.attachment) {
          attachment = '<div class="violation-date">Вложение недоступно</div>';
        }
        return '<article class="violation-card"><div class="violation-description">'+escapeHtml(violation.description)+'</div><div class="violation-date">Дата: '+escapeHtml(date)+' · Добавил: '+escapeHtml(violation.reporterName)+'</div>'+attachment+'</article>';
      }).join("");
    } catch (error) {
      history.innerHTML = "";
      document.getElementById("tutorDetailsError").textContent = error.message;
    }
  }

  document.getElementById("tutorStudentRows").addEventListener("click", async function (event) {
    var studentButton = event.target.closest("[data-tutor-student]");
    if (!studentButton) return;
    await openTutorStudentDetails(studentButton.dataset.tutorStudent);
  });
  document.getElementById("closeTutorStudentDetails").addEventListener("click", function () {
    document.getElementById("tutorStudentDetailsModal").hidden = true;
  });
  document.getElementById("tutorStudentDetailsModal").addEventListener("click", function (event) {
    if (event.target === this) this.hidden = true;
  });

  document.getElementById("tutorGroupCards").addEventListener("click", async function (event) {
    var card = event.target.closest("[data-tutor-group]");
    if (!card) return;
    try {
      await openTutorGroup(Number(card.dataset.tutorGroup));
    } catch (error) {
      showToast(error.message);
    }
  });
  document.getElementById("tutorBackToGroups").addEventListener("click", function () {
    document.getElementById("tutorGroupStudentsPanel").hidden = true;
    document.getElementById("tutorGroupsPanel").hidden = false;
  });

  async function loadReportableStudents() {
    var payload = await api("/api/reportable-students");
    reportableStudents = payload.students;
    renderReportableStudents();
  }

  async function loadViolations() {
    var payload = await api("/api/violations");
    violations = payload.violations;
    renderViolations();
  }

  function renderReportableStudents() {
    var select = document.getElementById("violationStudent");
    var facultySelect = document.getElementById("violationFaculty");
    var groupSelect = document.getElementById("violationGroup");
    var faculties = Array.from(new Set(reportableStudents.map(function (student) { return student.faculty; }).filter(Boolean))).sort(function (a, b) { return a.localeCompare(b); });
    var selectedFaculty = facultySelect.value;
    var facultyStillExists = faculties.indexOf(selectedFaculty) !== -1;
    if (!facultyStillExists) selectedFaculty = "";
    facultySelect.innerHTML = '<option value="">Выберите факультет</option>'+faculties.map(function (faculty) {
      return '<option value="'+escapeHtml(faculty)+'">'+escapeHtml(faculty)+'</option>';
    }).join("");
    facultySelect.value = selectedFaculty;

    var groups = Array.from(new Set(reportableStudents
      .filter(function (student) { return !selectedFaculty || student.faculty === selectedFaculty; })
      .map(function (student) { return student.group; }).filter(Boolean))).sort(function (a, b) { return a.localeCompare(b); });
    var selectedGroup = groupSelect.value;
    if (groups.indexOf(selectedGroup) === -1) selectedGroup = "";
    groupSelect.innerHTML = '<option value="">Выберите группу</option>'+groups.map(function (group) {
      return '<option value="'+escapeHtml(group)+'">'+escapeHtml(group)+'</option>';
    }).join("");
    groupSelect.value = selectedGroup;

    var filtered = reportableStudents.filter(function (student) {
      return (!selectedFaculty || student.faculty === selectedFaculty)
        && (!selectedGroup || student.group === selectedGroup);
    });
    select.innerHTML = '<option value="">Выберите студента</option>'+filtered.map(function (student) {
      var name = student.lastName+" "+student.firstName;
      var details = [student.faculty,student.group].filter(Boolean).join(" · ");
      return '<option value="'+escapeHtml(student.id)+'">'+escapeHtml(name+(details ? " — "+details : ""))+'</option>';
    }).join("");
  }

  function formatDate(value) {
    var parts = value.split("-");
    return parts.length === 3 ? parts[2]+"."+parts[1]+"."+parts[0] : value;
  }

  function renderStudents() {
    var query = document.getElementById("searchInput").value.trim().toLowerCase();
    var funding = document.getElementById("fundingFilter").value;
    var filtered = students.filter(function (student) {
      var text = [student.firstName,student.lastName,student.faculty,student.group].join(" ").toLowerCase();
      return (!query || text.indexOf(query) !== -1) && (!funding || student.funding === funding);
    });
    var labels = {contract:"Контракт","super-contract":"Супер-контракт",grant:"Грант"};
    document.getElementById("studentRows").innerHTML = filtered.map(function (student) {
      var initials = ((student.firstName||"").charAt(0)+(student.lastName||"").charAt(0)).toUpperCase();
      var photo = imageMarkup(student.photo, initials, "Фото студента");
      var fundingClass = student.funding === "grant" ? "funding grant" : "funding";
      var violationCount = Number(student.violationCount || 0);
      var meta = localizedText(student.gender)+(violationCount
        ? " · "+(language === "uz" ? "Qoidabuzarliklar: " : "Нарушений: ")+violationCount
        : "");
      return '<tr><td><div class="person-cell"><div class="person-photo">'+photo+'</div><div><div class="person-name">'+escapeHtml(student.lastName+" "+student.firstName)+'</div><div class="person-meta">'+escapeHtml(meta)+'</div></div></div></td><td>'+escapeHtml(student.faculty)+'</td><td>'+escapeHtml(student.group)+'</td><td><span class="'+fundingClass+'">'+escapeHtml(labels[student.funding])+'</span></td><td>'+escapeHtml(formatDate(student.birthDate))+'</td><td><div class="row-actions"><button class="icon-btn" type="button" data-edit="'+escapeHtml(student.id)+'" title="Изменить">✎</button><button class="icon-btn danger" type="button" data-delete="'+escapeHtml(student.id)+'" title="Удалить">×</button></div></td></tr>';
    }).join("");
    document.getElementById("studentTable").hidden = filtered.length === 0;
    document.getElementById("emptyState").hidden = filtered.length !== 0;
    document.getElementById("visibleCount").textContent = language === "uz"
      ? filtered.length+" / "+students.length+" ta yozuv"
      : filtered.length+" из "+students.length+" записей";
    document.getElementById("totalCount").textContent = students.length;
    document.getElementById("grantCount").textContent = students.filter(function (student) { return student.funding === "grant"; }).length;
    document.getElementById("contractCount").textContent = students.filter(function (student) { return student.funding !== "grant"; }).length;
  }

  document.getElementById("searchInput").addEventListener("input", renderStudents);
  document.getElementById("fundingFilter").addEventListener("change", renderStudents);
  document.getElementById("studentRows").addEventListener("click", async function (event) {
    var editButton = event.target.closest("[data-edit]");
    var deleteButton = event.target.closest("[data-delete]");
    if (editButton) openStudentModal(students.find(function (student) { return student.id === editButton.dataset.edit; }));
    if (deleteButton) {
      var student = students.find(function (item) { return item.id === deleteButton.dataset.delete; });
      if (student && confirm("Удалить запись студента «"+student.lastName+" "+student.firstName+"»?")) {
        await api("/api/students/"+encodeURIComponent(student.id), {method:"DELETE"});
        await loadStudents();
        showToast("Запись удалена");
      }
    }
  });

  function setActiveView(viewId) {
    document.querySelectorAll(".section-tab").forEach(function (button) {
      button.classList.toggle("active", button.dataset.view === viewId);
    });
    ["studentsView","tutorView","facultiesView","usersView","violationsView"].forEach(function (id) {
      document.getElementById(id).hidden = id !== viewId;
    });
  }
  document.querySelectorAll(".section-tab").forEach(function (button) {
    button.addEventListener("click", function () { setActiveView(button.dataset.view); });
  });

  function updateFacultyOptions(selectedFaculty, selectedGroup) {
    var facultySelect = document.getElementById("facultySelect");
    var groupSelect = document.getElementById("groupSelect");
    facultySelect.innerHTML = '<option value="">Выберите факультет</option>'+faculties.map(function (faculty) {
      return '<option value="'+escapeHtml(faculty.name)+'">'+escapeHtml(faculty.name)+'</option>';
    }).join("");
    facultySelect.value = selectedFaculty || "";
    var faculty = faculties.find(function (item) { return item.name === facultySelect.value; });
    var groups = faculty ? faculty.groups : [];
    groupSelect.innerHTML = '<option value="">Выберите группу</option>'+groups.map(function (group) {
      return '<option value="'+escapeHtml(group.name)+'">'+escapeHtml(group.name)+'</option>';
    }).join("");
    if (selectedGroup) groupSelect.value = selectedGroup;
  }

  document.getElementById("facultySelect").addEventListener("change", function () {
    updateFacultyOptions(this.value, "");
  });

  function openStudentModal(student) {
    editingId = student ? student.id : null;
    photoData = student ? student.photo || "" : "";
    document.getElementById("studentModalTitle").textContent = student ? "Редактировать данные" : "Добавить студента";
    document.getElementById("firstName").value = student ? student.firstName : "";
    document.getElementById("lastName").value = student ? student.lastName : "";
    document.getElementById("birthDate").value = student ? student.birthDate : "";
    document.getElementById("gender").value = student ? student.gender : "";
    updateFacultyOptions(student ? student.faculty : "", student ? student.group : "");
    document.getElementById("fundingSelect").value = student ? student.funding : "";
    document.getElementById("studentError").textContent = "";
    document.getElementById("photoInput").value = "";
    setPhotoPreview(photoData, student ? ((student.firstName||"").charAt(0)+(student.lastName||"").charAt(0)).toUpperCase() : "Фото");
    document.getElementById("studentModal").hidden = false;
  }

  function closeStudentModal() {
    document.getElementById("studentModal").hidden = true;
  }
  document.getElementById("addStudent").addEventListener("click", function () { openStudentModal(null); });
  document.getElementById("closeStudentModal").addEventListener("click", closeStudentModal);
  document.getElementById("cancelStudentModal").addEventListener("click", closeStudentModal);

  function setPhotoPreview(photo, fallback) {
    var preview = document.getElementById("photoPreview");
    preview.innerHTML = "";
    if (photo) {
      var image = document.createElement("img");
      image.onerror = function () { preview.textContent = fallback; };
      image.src = photo;
      preview.appendChild(image);
    } else preview.textContent = fallback;
  }

  function readStudentPhoto(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var data = String(reader.result);
        var image = new Image();
        image.onload = function () { resolve(data); };
        image.onerror = function () { reject(new Error("Не удалось открыть это изображение в браузере.")); };
        image.src = data;
      };
      reader.onerror = function () { reject(new Error("Не удалось прочитать изображение.")); };
      reader.readAsDataURL(file);
    });
  }

  document.getElementById("photoInput").addEventListener("change", async function () {
    var file = this.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type) || file.size > 5*1024*1024) {
      document.getElementById("studentError").textContent = "Выберите изображение размером до 5 МБ.";
      this.value = "";
      return;
    }
    var error = document.getElementById("studentError");
    error.textContent = "";
    try {
      photoData = await readStudentPhoto(file);
      setPhotoPreview(photoData,"Фото");
    } catch (requestError) {
      error.textContent = requestError.message;
      this.value = "";
    }
  });

  function renderViolations() {
    var list = document.getElementById("violationsList");
    var isAdmin = currentUser.role === "admin" || currentUser.role === "main_admin";
    document.getElementById("adminViolationStudents").hidden = !isAdmin;
    document.getElementById("violationRecordsSection").hidden = isAdmin;
    if (isAdmin) {
      renderAdminViolationStudents();
      return;
    }
    if (!violations.length) {
      list.innerHTML = '<div class="violation-empty">Нарушений пока нет.</div>';
      return;
    }
    list.innerHTML = violations.map(function (violation) {
      var actions = currentUser.role !== "admin" && currentUser.role !== "main_admin" ? "" :
        '<div class="user-actions"><button class="small-btn" type="button" data-edit-violation="'+escapeHtml(violation.id)+'">Изменить</button><button class="small-btn danger" type="button" data-delete-violation="'+escapeHtml(violation.id)+'">Удалить</button></div>';
      var attachment = violation.attachment
        ? '<a class="violation-attachment" href="'+escapeHtml(violation.attachment.data)+'" download="'+escapeHtml(violation.attachment.name)+'">📎 '+escapeHtml(violation.attachment.name)+'</a>'
        : "";
      var date = violation.createdAt
        ? new Date(violation.createdAt).toLocaleString(language === "uz" ? "uz-UZ" : "ru-RU")
        : "";
      var studentDetails = [violation.faculty,violation.group].filter(Boolean).join(" · ");
      return '<article class="violation-card"><div class="violation-card-head"><div><div class="person-name">'+escapeHtml(violation.studentName)+'</div><div class="person-meta">'+escapeHtml(studentDetails)+'</div></div>'+actions+'</div><div class="violation-description">'+escapeHtml(violation.description)+'</div><div class="violation-date">Сообщил: '+escapeHtml(violation.reporterName)+' · '+escapeHtml(date)+'</div>'+attachment+'</article>';
    }).join("");
  }

  function getAdminViolationStudents() {
    var grouped = {};
    violations.forEach(function (violation) {
      if (!grouped[violation.studentId]) {
        grouped[violation.studentId] = {
          id: violation.studentId,
          name: violation.studentName,
          faculty: violation.faculty,
          group: violation.group,
          violations: []
        };
      }
      grouped[violation.studentId].violations.push(violation);
    });
    return Object.keys(grouped).map(function (studentId) {
      return grouped[studentId];
    }).sort(function (left, right) {
      return left.name.localeCompare(right.name);
    });
  }

  function violationCountClass(count) {
    if (count >= 4) return "four";
    if (count === 3) return "three";
    if (count === 2) return "two";
    return "one";
  }

  function renderAdminViolationStudents() {
    var list = document.getElementById("adminViolationStudentsList");
    var query = document.getElementById("adminViolationSearch").value.trim().toLocaleLowerCase();
    var studentsWithViolations = getAdminViolationStudents().filter(function (student) {
      var searchable = [student.name, student.faculty, student.group].join(" ").toLocaleLowerCase();
      return !query || searchable.indexOf(query) !== -1;
    });
    document.getElementById("adminViolationStudentCount").textContent = language === "uz"
      ? studentsWithViolations.length+" nafar talaba"
      : studentsWithViolations.length+" студентов";
    document.getElementById("adminViolationStudentsEmpty").hidden = studentsWithViolations.length !== 0;
    list.innerHTML = studentsWithViolations.map(function (student) {
      var count = student.violations.length;
      var countClass = violationCountClass(count);
      var countLabel = language === "uz" ? count+" ta qoidabuzarlik" : count+" наруш.";
      var details = [student.faculty, student.group].filter(Boolean).join(" · ");
      return '<button class="admin-violation-student" type="button" data-admin-student="'+escapeHtml(student.id)+'"><span class="admin-violation-summary"><span class="person-name">'+escapeHtml(student.name)+'</span><span class="person-meta">'+escapeHtml(details)+'</span></span><span class="violation-count '+countClass+'">'+countLabel+'</span></button>';
    }).join("");
  }

  function openAdminStudentDetails(studentId) {
    var student = getAdminViolationStudents().find(function (item) { return item.id === studentId; });
    if (!student) return;
    document.getElementById("adminStudentDetailsTitle").textContent = student.name;
    document.getElementById("adminStudentProfile").innerHTML =
      '<div><div class="person-name">'+escapeHtml(student.name)+'</div><div class="person-meta">'+escapeHtml([student.faculty,student.group].filter(Boolean).join(" · "))+'</div></div>';
    document.getElementById("adminStudentViolations").innerHTML = student.violations.map(function (violation) {
      var date = violation.createdAt
        ? new Date(violation.createdAt).toLocaleString(language === "uz" ? "uz-UZ" : "ru-RU")
        : "";
      var actions = '<div class="user-actions"><button class="small-btn" type="button" data-edit-violation="'+escapeHtml(violation.id)+'">Изменить</button><button class="small-btn danger" type="button" data-delete-violation="'+escapeHtml(violation.id)+'">Удалить</button></div>';
      var attachment = violation.attachment
        ? '<a class="violation-attachment" href="'+escapeHtml(violation.attachment.data)+'" download="'+escapeHtml(violation.attachment.name)+'">📎 '+escapeHtml(violation.attachment.name)+'</a>'
        : "";
      return '<article class="violation-card"><div class="violation-card-head"><div class="violation-description">'+escapeHtml(violation.description)+'</div>'+actions+'</div><div class="violation-date">Сообщил: '+escapeHtml(violation.reporterName)+' · '+escapeHtml(date)+'</div>'+attachment+'</article>';
    }).join("");
    document.getElementById("adminStudentDetailsModal").hidden = false;
  }

  document.getElementById("adminViolationSearch").addEventListener("input", renderAdminViolationStudents);
  document.getElementById("adminViolationStudentsList").addEventListener("click", function (event) {
    var studentButton = event.target.closest("[data-admin-student]");
    if (studentButton) openAdminStudentDetails(studentButton.dataset.adminStudent);
  });
  document.getElementById("closeAdminStudentDetails").addEventListener("click", function () {
    document.getElementById("adminStudentDetailsModal").hidden = true;
  });
  document.getElementById("adminStudentDetailsModal").addEventListener("click", function (event) {
    if (event.target === this) this.hidden = true;
  });
  document.getElementById("adminStudentViolations").addEventListener("click", async function (event) {
    var editButton = event.target.closest("[data-edit-violation]");
    var deleteButton = event.target.closest("[data-delete-violation]");
    if (editButton) {
      var violation = violations.find(function (item) { return item.id === editButton.dataset.editViolation; });
      if (violation) {
        document.getElementById("adminStudentDetailsModal").hidden = true;
        openViolationEdit(violation);
      }
    }
    if (deleteButton) {
      var target = violations.find(function (item) { return item.id === deleteButton.dataset.deleteViolation; });
      if (!target || !confirm("Удалить нарушение студента «"+target.studentName+"»?")) return;
      try {
        var studentId = target.studentId;
        await api("/api/violations/"+encodeURIComponent(target.id), {method:"DELETE"});
        await loadViolations();
        if (violations.some(function (item) { return item.studentId === studentId; })) {
          openAdminStudentDetails(studentId);
        } else {
          document.getElementById("adminStudentDetailsModal").hidden = true;
        }
        showToast("Нарушение удалено");
      } catch (requestError) {
        showToast(requestError.message);
      }
    }
  });

  function showCurrentViolationAttachment() {
    var element = document.getElementById("currentViolationAttachment");
    if (!currentViolationAttachment) {
      element.innerHTML = "";
      return;
    }
    element.innerHTML = '<a class="violation-attachment" href="'+escapeHtml(currentViolationAttachment.data)+'" download="'+escapeHtml(currentViolationAttachment.name)+'">Текущее вложение: '+escapeHtml(currentViolationAttachment.name)+'</a>';
  }

  function resetViolationForm() {
    editingViolationId = null;
    currentViolationAttachment = null;
    document.getElementById("violationForm").reset();
    renderReportableStudents();
    document.getElementById("violationFormTitle").textContent = "Сообщить о нарушении";
    document.getElementById("saveViolation").textContent = "Отправить нарушение";
    document.getElementById("cancelViolationEdit").hidden = true;
    document.getElementById("violationFileName").textContent = "Файл не выбран (до 2 МБ)";
    document.getElementById("violationError").textContent = "";
    configureViolationForm();
    showCurrentViolationAttachment();
  }

  function openViolationEdit(violation) {
    editingViolationId = violation.id;
    currentViolationAttachment = violation.attachment;
    document.querySelector(".violation-form-card").hidden = false;
    document.getElementById("violationFaculty").value = violation.faculty || "";
    renderReportableStudents();
    document.getElementById("violationGroup").value = violation.group || "";
    renderReportableStudents();
    document.getElementById("violationStudent").value = violation.studentId;
    document.getElementById("violationDescription").value = violation.description;
    document.getElementById("violationFile").value = "";
    document.getElementById("violationFileName").textContent = "Выберите файл, чтобы заменить вложение";
    document.getElementById("violationFormTitle").textContent = "Редактировать нарушение";
    document.getElementById("saveViolation").textContent = "Сохранить изменения";
    document.getElementById("cancelViolationEdit").hidden = false;
    document.getElementById("violationError").textContent = "";
    showCurrentViolationAttachment();
    setActiveView("violationsView");
    document.getElementById("violationFormTitle").scrollIntoView({behavior:"smooth",block:"center"});
  }

  function attachmentType(file) {
    if (file.type) return file.type;
    var extension = file.name.toLowerCase().split(".").pop();
    return {
      pdf:"application/pdf",
      doc:"application/msword",
      docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      jpg:"image/jpeg",
      jpeg:"image/jpeg",
      png:"image/png",
      webp:"image/webp"
    }[extension] || "";
  }

  function readViolationAttachment(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve({name:file.name,type:attachmentType(file),size:file.size,data:String(reader.result)});
      };
      reader.onerror = function () { reject(new Error("Не удалось прочитать вложение.")); };
      reader.readAsDataURL(file);
    });
  }

  document.getElementById("violationFile").addEventListener("change", function () {
    var file = this.files[0];
    document.getElementById("violationFileName").textContent = file
      ? file.name+" (до 2 МБ; сохранённое вложение будет заменено)"
      : editingViolationId ? "Выберите файл, чтобы заменить вложение" : "Файл не выбран (до 2 МБ)";
  });

  document.getElementById("violationFaculty").addEventListener("change", function () {
    document.getElementById("violationGroup").value = "";
    document.getElementById("violationStudent").value = "";
    renderReportableStudents();
  });

  document.getElementById("violationGroup").addEventListener("change", function () {
    document.getElementById("violationStudent").value = "";
    renderReportableStudents();
  });

  document.getElementById("cancelViolationEdit").addEventListener("click", resetViolationForm);

  document.getElementById("violationForm").addEventListener("submit", async function (event) {
    event.preventDefault();
    var error = document.getElementById("violationError");
    error.textContent = "";
    var facultyId = document.getElementById("violationFaculty").value;
    var groupId = document.getElementById("violationGroup").value;
    var studentId = document.getElementById("violationStudent").value;
    var description = document.getElementById("violationDescription").value.trim();
    var file = document.getElementById("violationFile").files[0];
    if (!facultyId || !groupId || !studentId || !description) {
      error.textContent = "Выберите факультет, группу, студента и введите описание нарушения.";
      return;
    }
    if (file && (file.size > 2*1024*1024 || !attachmentType(file))) {
      error.textContent = "Прикрепите PDF, DOC, DOCX, JPG, PNG или WebP размером до 2 МБ.";
      return;
    }
    var wasEditing = Boolean(editingViolationId);
    try {
      var payload = {studentId:studentId,description:description};
      if (file) payload.attachment = await readViolationAttachment(file);
      else if (!editingViolationId) payload.attachment = null;
      if (editingViolationId) {
        await api("/api/violations/"+encodeURIComponent(editingViolationId), {method:"PUT",body:JSON.stringify(payload)});
      } else {
        await api("/api/violations", {method:"POST",body:JSON.stringify(payload)});
      }
      resetViolationForm();
      await Promise.all([loadViolations(), currentUser.role === "qalqon" ? Promise.resolve() : loadStudents()]);
      showToast(wasEditing ? "Нарушение обновлено" : "Нарушение отправлено");
    } catch (requestError) {
      error.textContent = requestError.message;
    }
  });

  document.getElementById("violationsList").addEventListener("click", async function (event) {
    var editButton = event.target.closest("[data-edit-violation]");
    var deleteButton = event.target.closest("[data-delete-violation]");
    if (editButton) {
      var violation = violations.find(function (item) { return item.id === editButton.dataset.editViolation; });
      if (violation) openViolationEdit(violation);
    }
    if (deleteButton) {
      var target = violations.find(function (item) { return item.id === deleteButton.dataset.deleteViolation; });
      if (!target || !confirm("Удалить нарушение студента «"+target.studentName+"»?")) return;
      try {
        await api("/api/violations/"+encodeURIComponent(target.id), {method:"DELETE"});
        await Promise.all([loadViolations(),loadStudents()]);
        showToast("Нарушение удалено");
      } catch (requestError) {
        showToast(requestError.message);
      }
    }
  });

  function cryptoRandomId() {
    return crypto.randomUUID ? crypto.randomUUID() : String(Date.now())+Math.random();
  }

  document.getElementById("studentForm").addEventListener("submit", async function (event) {
    event.preventDefault();
    var error = document.getElementById("studentError");
    error.textContent = "";
    var birthDate = document.getElementById("birthDate").value;
    var today = new Date();
    var todayString = today.getFullYear()+"-"+String(today.getMonth()+1).padStart(2,"0")+"-"+String(today.getDate()).padStart(2,"0");
    if (birthDate > todayString) { error.textContent = "Дата рождения не может быть в будущем."; return; }
    var student = {
      firstName:document.getElementById("firstName").value.trim(),
      lastName:document.getElementById("lastName").value.trim(),
      birthDate:birthDate,
      gender:document.getElementById("gender").value,
      faculty:document.getElementById("facultySelect").value,
      group:document.getElementById("groupSelect").value,
      funding:document.getElementById("fundingSelect").value,
      photo:photoData
    };
    if (!student.firstName || !student.lastName || !student.faculty || !student.group || !student.funding) { error.textContent = "Заполните все обязательные поля."; return; }
    try {
      if (editingId) await api("/api/students/"+encodeURIComponent(editingId), {method:"PUT",body:JSON.stringify(student)});
      else await api("/api/students", {method:"POST",body:JSON.stringify(student)});
      closeStudentModal();
      await loadStudents();
      showToast(editingId ? "Данные студента обновлены" : "Студент добавлен");
    } catch (requestError) { error.textContent = requestError.message; }
  });

  function renderFaculties() {
    var list = document.getElementById("facultyList");
    if (!faculties.length) {
      list.innerHTML = '<div class="faculty-empty"><strong>Факультетов пока нет</strong>Добавьте первый факультет.</div>';
      return;
    }
    list.innerHTML = faculties.map(function (faculty) {
      var groups = faculty.groups.length ? faculty.groups.map(function (group) {
        return '<span class="group-chip">'+escapeHtml(group.name)+'<button class="icon-btn danger" type="button" data-delete-group="'+escapeHtml(group.id)+'" data-faculty="'+escapeHtml(faculty.id)+'">×</button></span>';
      }).join("") : '<span style="color:#718096;font-size:11px">Группы не добавлены</span>';
      var groupCount = language === "uz" ? faculty.groups.length+" ta guruh" : faculty.groups.length+" групп";
      return '<article class="faculty-card"><div class="faculty-head"><div><div class="faculty-name">'+escapeHtml(faculty.name)+'</div><div class="faculty-count">'+groupCount+'</div></div><div class="faculty-actions"><button class="small-btn" type="button" data-add-group="'+escapeHtml(faculty.id)+'">+ Добавить группу</button><button class="small-btn danger" type="button" data-delete-faculty="'+escapeHtml(faculty.id)+'">Удалить факультет</button></div></div><div class="group-list">'+groups+'</div></article>';
    }).join("");
  }

  function openStructureModal(type, facultyId) {
    structureType = type;
    structureFacultyId = facultyId || null;
    document.getElementById("structureTitle").textContent = type === "faculty" ? "Добавить факультет" : "Добавить группу";
    document.getElementById("structureCaption").textContent = type === "faculty" ? "Факультет появится в карточке студента" : "Группа будет привязана к факультету";
    document.getElementById("structureLabel").textContent = type === "faculty" ? "Название факультета *" : "Название группы *";
    document.getElementById("structureName").value = "";
    document.getElementById("structureError").textContent = "";
    document.getElementById("structureModal").hidden = false;
  }
  function closeStructureModal() { document.getElementById("structureModal").hidden = true; }
  document.getElementById("addFaculty").addEventListener("click", function () { openStructureModal("faculty"); });
  document.getElementById("closeStructureModal").addEventListener("click", closeStructureModal);
  document.getElementById("cancelStructureModal").addEventListener("click", closeStructureModal);

  document.getElementById("structureForm").addEventListener("submit", async function (event) {
    event.preventDefault();
    var name = document.getElementById("structureName").value.trim();
    var error = document.getElementById("structureError");
    error.textContent = "";
    if (!name) { error.textContent = "Введите название."; return; }
    try {
      if (structureType === "faculty") {
        await api("/api/faculties",{method:"POST",body:JSON.stringify({name:name})});
      } else {
        var faculty = faculties.find(function (item) { return item.id === structureFacultyId; });
        var groups = faculty.groups.concat([{id:cryptoRandomId(),name:name}]);
        await api("/api/faculties/"+encodeURIComponent(faculty.id),{method:"PUT",body:JSON.stringify({groups:groups})});
      }
      closeStructureModal();
      await loadFaculties();
      if (structureType === "group" && currentUser.role === "main_admin") await loadUsers();
      showToast(structureType === "faculty" ? "Факультет добавлен" : "Группа добавлена");
    } catch (requestError) { error.textContent = requestError.message; }
  });

  document.getElementById("facultyList").addEventListener("click", async function (event) {
    var addGroup = event.target.closest("[data-add-group]");
    var deleteGroup = event.target.closest("[data-delete-group]");
    var deleteFaculty = event.target.closest("[data-delete-faculty]");
    if (addGroup) openStructureModal("group",addGroup.dataset.addGroup);
    if (deleteGroup) {
      var faculty = faculties.find(function (item) { return item.id === deleteGroup.dataset.faculty; });
      var group = faculty.groups.find(function (item) { return item.id === deleteGroup.dataset.deleteGroup; });
      var linked = students.some(function (student) { return student.faculty === faculty.name && student.group === group.name; });
      if (linked) { showToast("Нельзя удалить группу: у студентов есть эта группа."); return; }
      if (confirm("Удалить группу «"+group.name+"»?")) {
        var groups = faculty.groups.filter(function (item) { return item.id !== group.id; });
        await api("/api/faculties/"+encodeURIComponent(faculty.id),{method:"PUT",body:JSON.stringify({groups:groups})});
        var refreshTasks = [loadFaculties(),loadStudents()];
        if (currentUser.role === "main_admin") refreshTasks.push(loadUsers());
        await Promise.all(refreshTasks);
        showToast("Группа удалена");
      }
    }
    if (deleteFaculty) {
      if (!confirm("Удалить факультет и все его группы?")) return;
      try {
        await api("/api/faculties/"+encodeURIComponent(deleteFaculty.dataset.deleteFaculty),{method:"DELETE"});
        await loadFaculties();
        showToast("Факультет удалён");
      } catch (requestError) { showToast(requestError.message); }
    }
  });

  function renderUsers() {
    var list = document.getElementById("usersList");
    list.innerHTML = users.map(function (user) {
      var badgeClass = user.role === "main_admin" ? "role-badge main" : user.role === "admin" ? "role-badge admin" : "role-badge";
      var status = user.active ? "" : ' · <span style="color:#b44141">Ожидает подтверждения</span>';
      var actions = user.role === "main_admin" ? "" : user.role === "admin"
        ? '<button class="small-btn" type="button" data-user-password="'+escapeHtml(user.id)+'">Изменить пароль</button><button class="small-btn danger" type="button" data-user-revoke="'+escapeHtml(user.id)+'">Отозвать права</button>'
        : (user.active ? "" : '<button class="small-btn" type="button" data-user-approve="'+escapeHtml(user.id)+'">Подтвердить</button>')+
          '<button class="small-btn" type="button" data-user-grant="'+escapeHtml(user.id)+'">Выдать права администратора</button><button class="small-btn" type="button" data-user-password="'+escapeHtml(user.id)+'">Изменить пароль</button>';
      var assignment = "";
      if (user.role === "tutor") {
        var assigned = (user.groups || []).map(function (group) {
          return group.faculty+"\u0000"+group.group;
        });
        var options = faculties.reduce(function (html, faculty) {
          return html+faculty.groups.map(function (group) {
            var checked = assigned.indexOf(faculty.name+"\u0000"+group.name) !== -1 ? " checked" : "";
            return '<label><input type="checkbox" data-assignment-faculty="'+escapeHtml(faculty.name)+'" data-assignment-group="'+escapeHtml(group.name)+'"'+checked+'> '+escapeHtml(faculty.name)+' · '+escapeHtml(group.name)+'</label>';
          }).join("");
        }, "");
        assignment = '<details class="group-assignment"><summary>Группы тьютора ('+(user.groups || []).length+')</summary>'+(options || '<div class="user-meta">Сначала добавьте группы в разделе «Факультеты и группы».</div>')+'<div><button class="small-btn" type="button" data-save-user-groups="'+escapeHtml(user.id)+'">Сохранить группы</button></div></details>';
      }
      return '<article class="user-card"><div class="user-head"><div><div class="user-name">'+escapeHtml(user.fullName)+' <span style="color:#718096">('+escapeHtml(user.username)+')</span></div><div class="user-meta"><span class="'+badgeClass+'">'+escapeHtml(roleLabel(user.role))+'</span>'+status+'</div></div><div class="user-actions">'+actions+'</div></div>'+assignment+'</article>';
    }).join("");
  }

  function openPasswordModal(userId,title,action) {
    passwordUserId = userId;
    passwordAction = action || "password";
    document.getElementById("passwordTitle").textContent = title || "Изменить пароль";
    document.getElementById("newPassword").value = "";
    document.getElementById("passwordError").textContent = "";
    document.getElementById("passwordModal").hidden = false;
  }
  function closePasswordModal() { document.getElementById("passwordModal").hidden = true; }
  document.getElementById("closePasswordModal").addEventListener("click",closePasswordModal);
  document.getElementById("cancelPasswordModal").addEventListener("click",closePasswordModal);

  document.getElementById("passwordForm").addEventListener("submit",async function (event) {
    event.preventDefault();
    var password = document.getElementById("newPassword").value;
    try {
      var action = passwordAction;
      if (action === "grant") await api("/api/admin/users/"+encodeURIComponent(passwordUserId)+"/grant",{method:"PUT",body:JSON.stringify({password:password})});
      else await api("/api/admin/users/"+encodeURIComponent(passwordUserId)+"/password",{method:"PUT",body:JSON.stringify({password:password})});
      closePasswordModal();
      await loadUsers();
      showToast(action === "grant" ? "Права администратора выданы" : "Пароль изменён");
    } catch (requestError) { document.getElementById("passwordError").textContent = requestError.message; }
  });

  document.getElementById("usersList").addEventListener("click",async function (event) {
    var grant = event.target.closest("[data-user-grant]");
    var password = event.target.closest("[data-user-password]");
    var revoke = event.target.closest("[data-user-revoke]");
    var approve = event.target.closest("[data-user-approve]");
    var saveGroups = event.target.closest("[data-save-user-groups]");
    if (grant) openPasswordModal(grant.dataset.userGrant,"Выдать права администратора","grant");
    if (password) openPasswordModal(password.dataset.userPassword,"Изменить пароль","password");
    if (approve) {
      try {
        await api("/api/admin/users/"+encodeURIComponent(approve.dataset.userApprove)+"/approve",{method:"PUT",body:"{}"});
        await loadUsers();
        showToast("Аккаунт подтверждён");
      } catch (requestError) { showToast(requestError.message); }
    }
    if (saveGroups) {
      var card = saveGroups.closest(".user-card");
      var selectedGroups = Array.prototype.slice.call(card.querySelectorAll("[data-assignment-faculty]:checked")).map(function (checkbox) {
        return {faculty:checkbox.dataset.assignmentFaculty,group:checkbox.dataset.assignmentGroup};
      });
      try {
        await api("/api/admin/users/"+encodeURIComponent(saveGroups.dataset.saveUserGroups)+"/groups",{method:"PUT",body:JSON.stringify({groups:selectedGroups})});
        await loadUsers();
        showToast("Группы тьютору назначены");
      } catch (requestError) { showToast(requestError.message); }
    }
    if (revoke) {
      var user = users.find(function (item) { return item.id === revoke.dataset.userRevoke; });
      if (confirm("Отозвать права администратора у «"+user.fullName+"»?")) {
        await api("/api/admin/users/"+encodeURIComponent(user.id)+"/revoke",{method:"PUT",body:"{}"});
        await loadUsers();
        showToast("Права администратора отозваны");
      }
    }
  });

  applyPreferences();
  bootstrap();
}());
