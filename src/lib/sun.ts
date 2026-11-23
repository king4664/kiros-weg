/**
 * حساب مكان الشمس والشروق والغروب، بمعادلات NOAA المبسّطة (من غير مكتبة).
 * الدقة حوالي دقيقة أو اتنين، وده كفاية لألوان الخلفية.
 */

export const ALEXANDRIA = { lat: 31.2001, lon: 29.9187 } as const;

const RAD = Math.PI / 180;
const DAY_MS = 86_400_000;

interface SolarTerms {
  /** معادلة الوقت بالدقايق */
  eqTime: number;
  /** الميل الشمسي بالراديان */
  decl: number;
}

function dayOfYearUTC(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.floor((d.getTime() - start) / DAY_MS) + 1;
}

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function solarTerms(d: Date): SolarTerms {
  const year = d.getUTCFullYear();
  const days = isLeap(year) ? 366 : 365;
  const hour = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
  const g = ((2 * Math.PI) / days) * (dayOfYearUTC(d) - 1 + (hour - 12) / 24);
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);
  return { eqTime, decl };
}

/** ارتفاع الشمس عن الأفق بالدرجات في لحظة معيّنة. */
export function sunElevation(d: Date, lat: number = ALEXANDRIA.lat, lon: number = ALEXANDRIA.lon): number {
  const { eqTime, decl } = solarTerms(d);
  const minutesUTC = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
  const trueSolar = minutesUTC + eqTime + 4 * lon;
  const ha = (trueSolar / 4 - 180) * RAD;
  const phi = lat * RAD;
  const cosZ = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(ha);
  const zenith = Math.acos(Math.min(1, Math.max(-1, cosZ)));
  return 90 - zenith / RAD;
}

export interface SunTimes {
  sunrise: Date;
  solarNoon: Date;
  sunset: Date;
  /** أعلى ارتفاع للشمس في اليوم ده (الضهر) */
  noonElevation: number;
}

/**
 * الشروق والضهر والغروب لليوم اللي فيه اللحظة d (حسب تاريخ الجهاز).
 * بنحسب مرتين: مرة تقريبية، ومرة عند كل لحظة علشان الدقة.
 */
export function sunTimes(d: Date, lat: number = ALEXANDRIA.lat, lon: number = ALEXANDRIA.lon): SunTimes {
  const localNoon = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
  const utcMidnight = Date.UTC(localNoon.getUTCFullYear(), localNoon.getUTCMonth(), localNoon.getUTCDate());
  const phi = lat * RAD;

  const event = (kind: 'rise' | 'noon' | 'set', approx: Date): Date => {
    const { eqTime, decl } = solarTerms(approx);
    let minutes: number;
    if (kind === 'noon') {
      minutes = 720 - 4 * lon - eqTime;
    } else {
      const cosH =
        Math.cos(90.833 * RAD) / (Math.cos(phi) * Math.cos(decl)) - Math.tan(phi) * Math.tan(decl);
      const h = Math.acos(Math.min(1, Math.max(-1, cosH))) / RAD;
      minutes = kind === 'rise' ? 720 - 4 * (lon + h) - eqTime : 720 - 4 * (lon - h) - eqTime;
    }
    return new Date(utcMidnight + minutes * 60_000);
  };

  const refine = (kind: 'rise' | 'noon' | 'set'): Date => event(kind, event(kind, localNoon));
  const solarNoon = refine('noon');
  return {
    sunrise: refine('rise'),
    solarNoon,
    sunset: refine('set'),
    noonElevation: sunElevation(solarNoon, lat, lon),
  };
}
