import * as fp from 'fingerpose';

/**
 *  Thumbs down
 */
export const thumbsDownGesture = new fp.GestureDescription('thumbs_down');

thumbsDownGesture.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 1.0);
thumbsDownGesture.addDirection(fp.Finger.Thumb, fp.FingerDirection.VerticalDown, 1.0);
thumbsDownGesture.addDirection(fp.Finger.Thumb, fp.FingerDirection.DiagonalDownLeft, 0.25);
thumbsDownGesture.addDirection(fp.Finger.Thumb, fp.FingerDirection.DiagonalDownRight, 0.25);

// do this for all other fingers

// all other fingers:
// - curled
// - horizontal left or right
for (const finger of [fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
  thumbsDownGesture.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
  thumbsDownGesture.addDirection(finger, fp.FingerDirection.HorizontalLeft, 1.0);
  thumbsDownGesture.addDirection(finger, fp.FingerDirection.HorizontalRight, 1.0);
}

/**
 *  Pointer
 */


export const pointerGesture = new fp.GestureDescription('pointer');

// thumb:
pointerGesture.addCurl(fp.Finger.Thumb, fp.FingerCurl.HalfCurl, 0.5);
pointerGesture.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 0.5);
pointerGesture.addDirection(fp.Finger.Thumb, fp.FingerDirection.VerticalUp, .5);
pointerGesture.addDirection(fp.Finger.Thumb, fp.FingerDirection.DiagonalUpLeft, 1.0);


// index:
pointerGesture.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0);
pointerGesture.addDirection(fp.Finger.Index, fp.FingerDirection.VerticalUp, 1);
pointerGesture.addDirection(fp.Finger.Index, fp.FingerDirection.DiagonalUpLeft, .5);
pointerGesture.addDirection(fp.Finger.Index, fp.FingerDirection.DiagonalUpRight, .5);


pointerGesture.setWeight(fp.Finger.Index, 2);

for (const finger of [fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
  pointerGesture.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
  pointerGesture.addDirection(finger, fp.FingerDirection.VerticalUp, 0.2);
  pointerGesture.addDirection(finger, fp.FingerDirection.DiagonalUpLeft, 1.0);
  pointerGesture.addDirection(finger, fp.FingerDirection.HorizontalLeft, 0.2);
}

export const incredibleGesture = new fp.GestureDescription('incredible');

// thumb:
incredibleGesture.addCurl(fp.Finger.Thumb, fp.FingerCurl.HalfCurl, 1);
// incredibleGesture.addDirection(fp.Finger.Thumb, fp.FingerDirection.VerticalUp, 1.0);
incredibleGesture.addDirection(fp.Finger.Thumb, fp.FingerDirection.DiagonalUpLeft, 1);

// index:
incredibleGesture.addCurl(fp.Finger.Index, fp.FingerCurl.HalfCurl, 1);
// incredibleGesture.addDirection(fp.Finger.Index, fp.FingerDirection.VerticalUp, 1.0);
incredibleGesture.addDirection(fp.Finger.Index, fp.FingerDirection.HorizontalLeft, 1);

export const palmGesture = new fp.GestureDescription('palm');
// thumb:
palmGesture.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 1);
palmGesture.addDirection(fp.Finger.Thumb, fp.FingerDirection.HorizontalLeft, 1);


for (const finger of [fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
  palmGesture.addCurl(finger, fp.FingerCurl.NoCurl, 1.0);
  palmGesture.addDirection(finger, fp.FingerDirection.VerticalUp, 0.8);
}

export const rockGesture = new fp.GestureDescription('rock');

// Index
rockGesture.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1);
rockGesture.addDirection(fp.Finger.Index, fp.FingerDirection.VerticalUp, 1);
rockGesture.addDirection(fp.Finger.Index, fp.FingerDirection.DiagonalUpLeft, .25);

// Pinky
rockGesture.addCurl(fp.Finger.Pinky, fp.FingerCurl.NoCurl, 1);
rockGesture.addDirection(fp.Finger.Pinky, fp.FingerDirection.VerticalUp, 1);
rockGesture.addDirection(fp.Finger.Pinky, fp.FingerDirection.DiagonalUpRight, .25);


for (const finger of [ fp.Finger.Middle, fp.Finger.Ring]) {
  rockGesture.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
  rockGesture.addDirection(finger, fp.FingerDirection.HorizontalLeft, 1.0);
  rockGesture.addDirection(finger, fp.FingerDirection.HorizontalRight, 1.0);
}
