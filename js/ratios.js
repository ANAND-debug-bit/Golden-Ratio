// Pure geometry over the 68 face points face-api.js provides.
// Indices follow the iBUG 300-W layout: 0-16 jaw, 17-26 brows,
// 27-35 nose, 36-47 eyes, 48-67 mouth.

const PHI = 1.6180339887498949;

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function mid(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// Pull the handful of named points we need out of the raw array,
// so the rest of this file reads in English instead of magic indices.
function namedPoints(pts) {
  return {
    jawLeft:      pts[0],
    jawRight:     pts[16],
    chin:         pts[8],

    browTopRight: pts[19],   // roughly the peak of the right eyebrow
    browTopLeft:  pts[24],

    eyeRightOuter: pts[36],
    eyeRightInner: pts[39],
    eyeLeftInner:  pts[42],
    eyeLeftOuter:  pts[45],

    noseTop:    pts[27],
    noseBottom: pts[33],
    noseLeft:   pts[31],
    noseRight:  pts[35],

    mouthLeft:  pts[48],
    mouthRight: pts[54],
    mouthTop:   pts[51],
    mouthBottom:pts[57],
  };
}

// face-api's points stop at the eyebrows, so the hairline is estimated
// by mirroring the brow-to-chin distance upward.
function deriveHairline(p) {
  const browMid = mid(p.browTopRight, p.browTopLeft);
  const browToChin = dist(browMid, p.chin);
  // Classical canon treats brow-to-chin as roughly the lower two-thirds of the face.
  const faceLenEstimate = browToChin * 1.5;
  const dirY = (p.chin.y - browMid.y);
  const dirX = (p.chin.x - browMid.x);
  const len = Math.hypot(dirX, dirY) || 1;
  const unitX = dirX / len, unitY = dirY / len;
  return {
    x: browMid.x - unitX * (faceLenEstimate - browToChin),
    y: browMid.y - unitY * (faceLenEstimate - browToChin),
  };
}

// Six classical ratios, plus the raw points needed to draw them later.
function computeFacialRatios(rawPoints) {
  const p = namedPoints(rawPoints);
  const hairline = deriveHairline(p);

  const faceWidth   = dist(p.jawLeft, p.jawRight);
  const faceLength  = dist(hairline, p.chin);
  const rightEyeCenter = mid(p.eyeRightOuter, p.eyeRightInner);
  const leftEyeCenter  = mid(p.eyeLeftInner, p.eyeLeftOuter);
  const pupilSpan    = dist(rightEyeCenter, leftEyeCenter);
  const noseWidth    = dist(p.noseLeft, p.noseRight);
  const mouthWidth   = dist(p.mouthLeft, p.mouthRight);
  const eyeLineMid   = mid(mid(p.eyeRightOuter, p.eyeRightInner), mid(p.eyeLeftInner, p.eyeLeftOuter));
  const eyeToChin    = dist(eyeLineMid, p.chin);
  const rightEyeWidth = dist(p.eyeRightOuter, p.eyeRightInner);
  const leftEyeWidth  = dist(p.eyeLeftInner, p.eyeLeftOuter);
  const avgEyeWidth   = (rightEyeWidth + leftEyeWidth) / 2;
  const interEyeGap   = dist(p.eyeRightInner, p.eyeLeftInner);
  const noseToLip     = dist(p.noseBottom, p.mouthTop);
  const lipToChin     = dist(p.mouthBottom, p.chin);

  const rows = [
    {
      key: 'faceLengthWidth',
      label: 'Face length to face width',
      value: faceLength / faceWidth,
      ideal: PHI,
      points: [hairline, p.chin, p.jawLeft, p.jawRight],
    },
    {
      key: 'pupilNose',
      label: 'Eye span to nose width',
      value: pupilSpan / noseWidth,
      ideal: PHI,
      points: [p.eyeRightOuter, p.eyeLeftOuter, p.noseLeft, p.noseRight],
    },
    {
      key: 'mouthNose',
      label: 'Mouth width to nose width',
      value: mouthWidth / noseWidth,
      ideal: PHI,
      points: [p.mouthLeft, p.mouthRight, p.noseLeft, p.noseRight],
    },
    {
      key: 'faceLengthEyeChin',
      label: 'Face length to eye-line-to-chin',
      value: faceLength / eyeToChin,
      ideal: PHI,
      points: [hairline, p.chin, eyeLineMid],
    },
    {
      key: 'eyeWidthGap',
      label: 'Eye width to inter-eye gap',
      value: avgEyeWidth / interEyeGap,
      ideal: 1.0,
      points: [p.eyeRightOuter, p.eyeRightInner, p.eyeLeftInner, p.eyeLeftOuter],
    },
    {
      key: 'lipChinNoseLip',
      label: 'Lip-to-chin to nose-to-lip',
      value: lipToChin / noseToLip,
      ideal: PHI,
      points: [p.mouthBottom, p.chin, p.noseBottom, p.mouthTop],
    },
  ];

  // diffPct = how far the measured value sits from its ideal, as a percentage.
  rows.forEach(r => {
    r.diffPct = Math.abs(r.value - r.ideal) / r.ideal * 100;
  });

  return { rows, hairline, faceWidth, faceLength };
}

// Single 0-100 score from the six diffs, on a raised-cosine curve so
// small misses barely cost anything and big ones cost a lot.
function scoreFromRatios(rows) {
  const perRowScores = rows.map(r => {
    const diff = r.diffPct;
    // Any ratio off by 45% or more scores zero.
    const tolerance = 45;
    const clamped = Math.min(diff, tolerance);
    const normalised = clamped / tolerance;
    const curved = 0.5 * (1 + Math.cos(Math.PI * normalised)); // 1 -> 0
    return curved * 100;
  });
  const total = perRowScores.reduce((a, b) => a + b, 0) / perRowScores.length;
  return Math.round(total);
}

// Verdict per score band. Neutral on purpose — a measurement, not a beauty grade.
function verdictFromScore(score) {
  if (score >= 90) return 'About as close to the classical ratio as faces get.';
  if (score >= 78) return 'Closer to the golden ratio than most measured faces.';
  if (score >= 62) return 'A fairly ordinary distance from the golden ratio — which is to say, normal.';
  if (score >= 45) return 'Your proportions lean away from the classical ideal in a few places.';
  return 'Several ratios sit well outside the classical range — see the breakdown below.';
}

