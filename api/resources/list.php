<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$raw = file_get_contents('php://input');
if ($raw === false) $raw = '';

// This endpoint is intentionally simple/static for now.
// It returns paginated recommended articles + videos for resource.html.

$PAGE_SIZE = 6;
$page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;

$articles = [
  [
    'title' => 'Caring for Your Mental Health (NIMH)',
    'desc'  => 'Trusted guidance for maintaining emotional wellness and getting help when needed.',
    'url'   => 'https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health',
    'icon'  => 'fa-solid fa-brain'
  ],
  [
    'title' => 'Stress Management Guide (HelpGuide)',
    'desc'  => 'Practical stress reduction methods for day-to-day life and student pressure.',
    'url'   => 'https://www.helpguide.org/articles/stress/stress-management.htm',
    'icon'  => 'fa-solid fa-heart-pulse'
  ],
  [
    'title' => 'How to Improve Your Skills (Coursera)',
    'desc'  => 'Actionable ways to improve personal and professional skills over time.',
    'url'   => 'https://www.coursera.org/articles/how-to-improve-your-skills',
    'icon'  => 'fa-solid fa-lightbulb'
  ],
  [
    'title' => 'How to Meditate (Mindful)',
    'desc'  => 'Simple mindfulness steps to calm your mind and improve focus.',
    'url'   => 'https://www.mindful.org/how-to-meditate/',
    'icon'  => 'fa-solid fa-spa'
  ],
  [
    'title' => 'How to Improve Communication Skills (edX)',
    'desc'  => 'Build confidence and communication strength for studies and career.',
    'url'   => 'https://www.edx.org/resources/how-to-improve-communication-skills',
    'icon'  => 'fa-solid fa-comments'
  ],
  [
    'title' => 'How to Manage Stress as a Student (Verywell Mind)',
    'desc'  => 'Practical tips for handling academic stress and pressure.',
    'url'   => 'https://www.verywellmind.com/top-school-stress-relievers-for-students-3145179',
    'icon'  => 'fa-solid fa-leaf'
  ],
  [
    'title' => 'The Science of Well-Being (Yale Open Course)',
    'desc'  => 'Yale\'s most popular course on happiness and wellbeing, free online.',
    'url'   => 'https://www.coursera.org/learn/the-science-of-well-being',
    'icon'  => 'fa-solid fa-heart'
  ],
  [
    'title' => '10 Tips for Effective Online Learning (Harvard)',
    'desc'  => 'Expert advice for thriving in online and hybrid learning environments.',
    'url'   => 'https://www.harvard.edu/in-focus/10-tips-for-effective-online-learning/',
    'icon'  => 'fa-solid fa-graduation-cap'
  ],
  [
    'title' => 'Building Resilience: Skills to Thrive (APA)',
    'desc'  => 'Learn how to bounce back from setbacks and build emotional strength.',
    'url'   => 'https://www.apa.org/topics/resilience',
    'icon'  => 'fa-solid fa-seedling'
  ],
  [
    'title' => 'Mindfulness for Students (Mindful.org)',
    'desc'  => 'Simple mindfulness practices to help you focus and reduce anxiety.',
    'url'   => 'https://www.mindful.org/mindfulness-for-students/',
    'icon'  => 'fa-solid fa-spa'
  ],
  [
    'title' => 'How to Get Motivated to Study (Oxford Learning)',
    'desc'  => 'Strategies to boost your motivation and stay on track with your studies.',
    'url'   => 'https://www.oxfordlearning.com/how-to-get-motivated-to-study/',
    'icon'  => 'fa-solid fa-bolt'
  ],
  [
    'title' => 'Healthy Habits for Academic Success (Edutopia)',
    'desc'  => 'Tips for building routines that support your learning and wellbeing.',
    'url'   => 'https://www.edutopia.org/article/healthy-habits-academic-success',
    'icon'  => 'fa-solid fa-apple-whole'
  ],
];

$videos = [
  [
    'title' => 'The Habits of Successful Students (Thomas Frank)',
    'desc'  => 'Learn daily routines used by top-performing students.',
    'yt'    => '1xeHh5DnCIw'
  ],
  [
    'title' => 'Evidence-based Revision Tips (Ali Abdaal)',
    'desc'  => 'Practical, research-backed exam preparation methods.',
    'yt'    => 'ukLnPbIffxE'
  ],
  [
    'title' => 'How to Practice Mindfulness (Headspace)',
    'desc'  => 'Simple guided mindfulness for beginners.',
    'yt'    => 'inpok4MKVLM'
  ],
  [
    'title' => 'How to Manage Stress (Kati Morton)',
    'desc'  => 'Practical ways to cope with stress and anxiety.',
    'yt'    => 'hnpQrMqDoqE'
  ],
  [
    'title' => 'Building Resilience (Psych Hub)',
    'desc'  => 'Short video about coping and bouncing back.',
    'yt'    => '4q1dgn_C0AU'
  ],
];

$articlesTotal = count($articles);
$videosTotal = count($videos);

$articlesPages = max(1, (int)ceil($articlesTotal / $PAGE_SIZE));
$videosPages = max(1, (int)ceil($videosTotal / $PAGE_SIZE));

$articlesPage = min($articlesPages, $page);
$videosPage = min($videosPages, $page);

$articlesSlice = array_slice($articles, ($articlesPage-1)*$PAGE_SIZE, $PAGE_SIZE);
$videosSlice = array_slice($videos, ($videosPage-1)*$PAGE_SIZE, $PAGE_SIZE);

$imgFor = fn($id) => "https://img.youtube.com/vi/{$id}/hqdefault.jpg";

$outVideos = array_map(function($v) use ($imgFor) {
  return [
    'title' => $v['title'],
    'desc'  => $v['desc'],
    'href'  => 'https://www.youtube.com/watch?v='.$v['yt'],
    'thumb' => $imgFor($v['yt']),
    'playIconClass' => 'fa-solid fa-play'
  ];
}, $videosSlice);

echo json_encode([
  'success' => true,
  'data' => [
    'page' => $page,
    'page_size' => $PAGE_SIZE,
    'articles' => [
      'items' => array_values($articlesSlice),
      'total' => $articlesTotal,
      'total_pages' => $articlesPages,
    ],
    'videos' => [
      'items' => array_values($outVideos),
      'total' => $videosTotal,
      'total_pages' => $videosPages,
    ],
  ]
]);

