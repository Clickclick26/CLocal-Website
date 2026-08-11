/**
 * Temporary shared password gate for ClickClick Academy.
 * Not real auth — replace with proper login before public launch.
 */
(function () {
  var STORAGE_KEY = 'clickclick_academy_ok_v1';
  var PASSWORD = 'Clickclick123';

  var COURSES = [
    {
      id: 'hook',
      title: 'Hook in 3 seconds',
      tag: 'Reviews',
      lessons: 4,
      level: 'Start here',
      status: 'Not started',
      icon: '▶',
      tone: '#d8f3f7',
    },
    {
      id: 'tag',
      title: 'Tag the shop right',
      tag: 'Shops',
      lessons: 3,
      level: 'Core',
      status: 'Not started',
      icon: '◎',
      tone: '#ebe4f5',
    },
    {
      id: 'phone',
      title: 'Phone + light basics',
      tag: 'Filming',
      lessons: 5,
      level: 'Core',
      status: 'Not started',
      icon: '✦',
      tone: '#fde8f1',
    },
    {
      id: 'cta',
      title: 'CTAs that sell',
      tag: 'Sales',
      lessons: 3,
      level: 'Next',
      status: 'Not started',
      icon: '↑',
      tone: '#fff0d8',
    },
    {
      id: 'edit',
      title: 'Edit for scroll stop',
      tag: 'Editing',
      lessons: 4,
      level: 'Next',
      status: 'Not started',
      icon: '✂',
      tone: '#e4f7ea',
    },
    {
      id: 'coach',
      title: 'Book free coaching',
      tag: 'Coaching',
      lessons: 1,
      level: '1:1',
      status: 'Book call',
      statusClass: 'is-coach',
      icon: '☎',
      tone: '#f3e8ff',
      href: 'mailto:hello@clickclick.video?subject=ClickClick%20Academy%20coaching',
    },
  ];

  var gate = document.getElementById('gate');
  var app = document.getElementById('app');
  var form = document.getElementById('gate-form');
  var input = document.getElementById('password');
  var err = document.getElementById('gate-error');
  var logout = document.getElementById('logout');
  var search = document.getElementById('course-search');
  var grid = document.getElementById('courses-grid');
  var preview = document.getElementById('courses-preview');
  var countEl = document.getElementById('course-count');
  var viewDash = document.getElementById('view-dashboard');
  var viewCourses = document.getElementById('view-courses');

  function unlocked() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function showApp(ok) {
    if (ok) {
      gate.hidden = true;
      app.hidden = false;
    } else {
      gate.hidden = false;
      app.hidden = true;
    }
  }

  function cardHtml(course) {
    var statusClass = course.statusClass ? ' status ' + course.statusClass : ' status';
    var openAttr = course.href
      ? ' data-href="' + course.href + '"'
      : '';
    return (
      '<article class="course-card" data-id="' +
      course.id +
      '" data-title="' +
      course.title.toLowerCase() +
      '" data-tag="' +
      course.tag.toLowerCase() +
      '"' +
      openAttr +
      '>' +
      '<div class="course-visual" style="background:' +
      course.tone +
      '">' +
      '<span class="course-lessons">' +
      course.lessons +
      (course.lessons === 1 ? ' lesson' : ' lessons') +
      '</span>' +
      '<span class="course-icon" aria-hidden="true">' +
      course.icon +
      '</span>' +
      '</div>' +
      '<div class="course-body">' +
      '<span class="course-tag">' +
      course.tag +
      '</span>' +
      '<h3>' +
      course.title +
      '</h3>' +
      '<div class="course-meta">' +
      '<span>Level: ' +
      course.level +
      '</span>' +
      '<span class="' +
      statusClass.trim() +
      '">' +
      course.status +
      '</span>' +
      '</div>' +
      '</div>' +
      '</article>'
    );
  }

  function renderCourses() {
    if (grid) {
      grid.innerHTML = COURSES.map(cardHtml).join('');
    }
    if (preview) {
      preview.innerHTML = COURSES.slice(0, 3).map(cardHtml).join('');
    }
    if (countEl) {
      countEl.textContent = COURSES.length + ' courses';
    }
  }

  function setView(name) {
    var isDash = name === 'dashboard';
    if (viewDash) viewDash.hidden = !isDash;
    if (viewCourses) viewCourses.hidden = isDash;
    document.querySelectorAll('.nav-btn[data-view]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-view') === name);
    });
  }

  function filterCourses(q) {
    var query = (q || '').trim().toLowerCase();
    document.querySelectorAll('#courses-grid .course-card').forEach(function (card) {
      if (!query) {
        card.classList.remove('is-hidden');
        return;
      }
      var hay =
        (card.getAttribute('data-title') || '') +
        ' ' +
        (card.getAttribute('data-tag') || '');
      card.classList.toggle('is-hidden', hay.indexOf(query) === -1);
    });
  }

  renderCourses();
  showApp(unlocked());

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = (input && input.value) || '';
      if (value === PASSWORD) {
        try {
          sessionStorage.setItem(STORAGE_KEY, '1');
        } catch (errSet) {}
        if (err) err.hidden = true;
        showApp(true);
      } else {
        if (err) err.hidden = false;
        if (input) {
          input.value = '';
          input.focus();
        }
      }
    });
  }

  if (logout) {
    logout.addEventListener('click', function () {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
      if (input) input.value = '';
      showApp(false);
    });
  }

  document.querySelectorAll('[data-view]').forEach(function (el) {
    el.addEventListener('click', function () {
      setView(el.getAttribute('data-view'));
    });
  });

  if (search) {
    search.addEventListener('input', function () {
      setView('courses');
      filterCourses(search.value);
    });
  }

  document.addEventListener('click', function (e) {
    var card = e.target.closest('.course-card[data-href]');
    if (card && card.getAttribute('data-href')) {
      window.location.href = card.getAttribute('data-href');
    }
  });
})();
