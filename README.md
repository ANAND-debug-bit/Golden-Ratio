<h1>PROJECT TITLE: The Golden Ratio</h1>
<hr>
<h3>AUTHOR : ATHARV ANAND</h3>
<br>

<h2>How To Use The Website</h2>
<p>
  Open the site and you'll land on a short intro explaining what the golden ratio is and where it shows up in nature and classical art. Scroll down (or hit "Take the measurement") and you're dropped into Step 1: get a photo.
<br>
  You can either use your camera to take a single still frame right there — nothing gets recorded — or upload a JPG/PNG you already have. One face, facing forward, works best.
<br>
  Look straight at the camera, pull your hair back from your forehead and jaw if you can, and keep the lighting even — a tilted head throws off the measurement more than bad lighting does.
<br>
  Centre your face inside the on-screen guide, then take the still (or confirm your upload).
<br>
  From there the face model loads in your browser and finds 68 points on your face — the same landmark scheme ophthalmologists and animators use. It takes six classical proportion measurements between those points (face length ÷ face width, pupil span ÷ nose width, mouth width ÷ nose width, face length ÷ eye-to-chin, eye width ÷ inter-eye gap, and lip-to-chin ÷ nose-to-lip), compares each one to Φ (1.618) or to its known "ideal" ratio, and averages the six into a single score.
<br>
  You get a construction-plate style breakdown of your face with all six ratios laid out, so you can see exactly which features pulled your score up or down.
</p>
<hr>

<h3>Why I made this website ?</h3>
<hr>
<p>
  I made this because the golden ratio is one of those ideas everyone's heard of but almost no one has actually seen applied to their own face. Painters and architects have used it to plan faces for six hundred years, and nature's been doing it even longer — seashells, sunflowers, tree branches. I wanted a page that just does the same thing to you: finds your features and runs the numbers, right there in the browser, no signup and no server round-trip.
</p>

<h2>Some cool features</h2>
<ul>
  <li>runs entirely client-side — the face landmark model downloads once and every measurement after that happens locally in JavaScript, so your photo never leaves your browser (there isn't even a server to send it to)</li>
  <li>works with either a live camera capture or an uploaded photo</li>
  <li>68-point facial landmark detection using face-api.js, the same scheme used in ophthalmology and animation rigging</li>
  <li>six separate golden-ratio measurements (not just one number pulled from nowhere) — face proportions, eye spacing, nose/mouth width, and the lower-third lip-to-chin split</li>
  <li>a "construction plate" style visual breakdown of your face once the measurement is done, like something a draftsman would pin above a desk</li>
  <li>clear privacy section explaining exactly why nothing is uploaded — no server, no storage, no tracking</li>
</ul>
<hr>

<h3> AI use </h3>
<p>I used AI to help figure out which classical facial-proportion ratios to measure and how to structure the scoring/averaging logic across the six measurements, and to help write the explanatory copy for the "method" and "privacy" sections.</p>
<hr>

<h2>TECH STACK</h2>
<br>
<img alt="HTML5" src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" />
<img alt="CSS3" src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" />
<img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
<img alt="face-api.js" src="https://img.shields.io/badge/face--api.js-000000?style=for-the-badge" />
<img alt="Vercel" src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
</body>
</html>
