import { SearchError, Snapshot, DateFilter, DateCondition } from './types';
/** A calendar day as Power BI shows it ("YYYY-MM-DD"), never a UTC instant.
 *
 * 0.5.3: Power BI hands Date/DateTime cells to a custom visual as JavaScript
 * Date objects built from the model's wall-clock value in the browser's own
 * time zone (Microsoft's Timeline visual reads them with local getters for the
 * same reason). The day the report shows is therefore the Date's LOCAL
 * year/month/day. 0.5.2 read the UTC parts, which moved every midnight value
 * one day earlier east of UTC (for example in the Netherlands, UTC+1/+2).
 * Zone-less ISO strings keep their written day; zoned ISO strings are instants
 * and are read in the same local zone as Date objects. */
export const DATE_CONDITIONS: readonly DateCondition[] = ['on','between','onOrBefore','onOrAfter','blank'];
/** Local calendar day of a Date (the wall-clock day Power BI displays). */
export function localDay(date: Date): string {
    const y=date.getFullYear(), m=date.getMonth()+1, d=date.getDate();
    return `${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
export function todayDay(): string { return localDay(new Date()); }
export function validDay(value: unknown): value is string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y,m,d]=value.split('-').map(Number);
    if (y<1 || m<1 || m>12 || d<1 || d>31) return false;
    const date=new Date(0); date.setUTCFullYear(y,m-1,d); date.setUTCHours(0,0,0,0);
    return date.getUTCFullYear()===y && date.getUTCMonth()===m-1 && date.getUTCDate()===d;
}
export function hostDay(value: unknown): string | null {
    if (value===null || value===undefined) return null;
    if (typeof value==='string' && validDay(value)) return value;
    if (typeof value==='string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,7})?)?$/.test(value)) {
        const day=value.slice(0,10), clock=value.slice(11).split(':').map(Number);
        if (validDay(day) && clock[0]<24 && clock[1]<60 && (clock[2]??0)<60) return day;
    }
    let date: Date | undefined;
    if (Object.prototype.toString.call(value)==='[object Date]') date=value as Date;
    else if (typeof value==='string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,7})?)?(Z|[+-]\d{2}:\d{2})$/.test(value) && validDay(value.slice(0,10))) date=new Date(value);
    if (date && Number.isFinite(date.getTime())) {
        const day=localDay(date); if (validDay(day)) return day;
    }
    throw new SearchError('date-value','A Date field contains an invalid value. Use a real Date/DateTime column, not a hierarchy or numeric serial.');
}
export function parseTypedDay(value: string): string | null {
    const text=value.trim(); if (validDay(text)) return text;
    const m=/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(text);
    if (!m) return null;
    const day=`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    return validDay(day)?day:null;
}
export function displayDay(day: string, short=false): string {
    if (!validDay(day)) return day;
    const [y,m,d]=day.split('-');
    if (short) return `${Number(d)} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(m)-1]} ${y}`;
    return `${d}/${m}/${y}`;
}
export function normaliseDateFilter(value: unknown): DateFilter | null {
    if (value===null || value===undefined) return null;
    if (!value || typeof value!=='object') throw new SearchError('date-filter','Choose a valid date filter.');
    const v=value as Record<string,unknown>;
    if (typeof v.fieldId!=='string' || !v.fieldId || !DATE_CONDITIONS.includes(v.condition as DateCondition)) throw new SearchError('date-filter','Choose a date column and condition.');
    const condition=v.condition as DateCondition;
    if (condition==='blank') return {fieldId:v.fieldId,condition};
    if (!validDay(v.from)) throw new SearchError('date-from','Enter a complete date: DD/MM/YYYY or YYYY-MM-DD.');
    if (condition==='between') {
        if (!validDay(v.to)) throw new SearchError('date-to','Choose the end date.');
        if (v.from>v.to) throw new SearchError('date-order','The From date must be on or before the To date.');
        return {fieldId:v.fieldId,condition,from:v.from,to:v.to};
    }
    return {fieldId:v.fieldId,condition,from:v.from};
}
export function dateMatches(day: string|null, filter: DateFilter): boolean {
    if (filter.condition==='blank') return day===null;
    if (day===null) return false;
    switch(filter.condition){
        case 'on':return day===filter.from;
        case 'between':return day>=filter.from! && day<=filter.to!;
        case 'onOrBefore':return day<=filter.from!;
        case 'onOrAfter':return day>=filter.from!;
    }
}
export function dateLabel(filter: DateFilter): string {
    if (filter.condition==='blank') return 'No date';
    if (filter.condition==='between') return `${displayDay(filter.from!,true)} – ${displayDay(filter.to!,true)}`;
    const prefix=filter.condition==='onOrBefore'?'On/before ':filter.condition==='onOrAfter'?'On/after ':'';
    return prefix+displayDay(filter.from!,true);
}
/** Short chip text as drawn in the approved mock ("8 Oct 2026", "1–31 Oct").
 * 0.5.2 always printed both full dates ("1 Oct 2026 – 31 Oct 2026"), which
 * the slim bar truncated. The year is omitted from a range only when the whole
 * range lies in the current year. dateLabel() keeps the full form for tooltips
 * and screen readers. */
export function compactDateLabel(filter: DateFilter, today: string = todayDay()): string {
    if (filter.condition!=='between' || !validDay(filter.from) || !validDay(filter.to)) return dateLabel(filter);
    const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const [fy,fm,fd]=filter.from.split('-').map(Number),[ty,tm,td]=filter.to.split('-').map(Number);
    if (fy!==ty) return `${displayDay(filter.from,true)} – ${displayDay(filter.to,true)}`;
    const year=String(fy)===today.slice(0,4)?'':` ${fy}`;
    if (filter.from===filter.to) return `${fd} ${months[fm-1]}${year}`;
    if (fm===tm) return `${fd}–${td} ${months[fm-1]}${year}`;
    return `${fd} ${months[fm-1]} – ${td} ${months[tm-1]}${year}`;
}
export interface DateCatalogue { fieldId:string; days:string[]; blanks:number; complete:boolean; }
export function availableDates(snapshot: Snapshot | null): DateCatalogue[] {
    if (!snapshot?.complete) return [];
    return (snapshot.dateFields||[]).map((field,index)=>{
        const days=new Set<string>();let blanks=0;
        for(const row of snapshot.rows){const day=row.dates?.[index]??null;if(day===null)blanks++;else days.add(day);}
        return {fieldId:field.id,days:[...days].sort(),blanks,complete:true};
    });
}
export interface DaySuggestions { days: string[]; more: boolean; }
/** Capped suggestion list. Without typed text and with an anchor (the chosen
 * day, or today), the window is placed around the anchor instead of always
 * showing the oldest dates: 0.5.2 listed only the first 80 sorted days, so a
 * column with more history could not reach current dates without typing. */
export function daySuggestions(days: readonly string[], typed: string, limit=80, anchor?: string): DaySuggestions {
    const needle=typed.trim().toLowerCase();
    const matches=needle ? days.filter(day=>day.includes(needle) || displayDay(day).includes(needle) || displayDay(day,true).toLowerCase().includes(needle)) : [...days];
    if (matches.length<=limit) return {days:matches, more:false};
    if (needle || !anchor || !validDay(anchor)) return {days:matches.slice(0,limit), more:true};
    let index=matches.findIndex(day=>day>=anchor); if (index<0) index=matches.length-1;
    const start=Math.max(0, Math.min(matches.length-limit, index-Math.floor(limit/4)));
    return {days:matches.slice(start,start+limit), more:true};
}
export function suggestedDays(days: readonly string[], typed: string, limit=80, anchor?: string): string[] {
    return daySuggestions(days, typed, limit, anchor).days;
}
export function shiftDay(day:string, amount:number):string {
    if(!validDay(day))throw new SearchError('date','Invalid calendar day.');
    const date=new Date(`${day}T12:00:00.000Z`);date.setUTCDate(date.getUTCDate()+amount);
    return date.toISOString().slice(0,10);
}

const MONTHS: Record<string, number> = {
    jan:1, january:1, januari:1, feb:2, february:2, februari:2, mar:3, march:3, mrt:3, maart:3, apr:4, april:4,
    may:5, mei:5, jun:6, june:6, juni:6, jul:7, july:7, juli:7, aug:8, august:8, augustus:8,
    sep:9, sept:9, september:9, oct:10, october:10, okt:10, oktober:10, nov:11, november:11, dec:12, december:12,
};
/** 0.5.4: what a reader types in the date field of the options row. Accepts
 * everything parseTypedDay accepts plus the label the field displays
 * ("8 Oct 2026"), Dutch month names ("8 okt 2026") and "Oct 8, 2026".
 * Day-first for numeric dates; never guesses a two-digit year. */
export function parseDayText(value: string): string | null {
    const numeric = parseTypedDay(value);
    if (numeric) return numeric;
    const text = value.trim().toLowerCase().replace(/\s+/g, ' ');
    let m = /^(\d{1,2})[ \-.]([a-z]+)\.?[ \-.,]+(\d{4})$/.exec(text);
    let d: number | undefined, mo: number | undefined, y: number | undefined;
    if (m) { d = Number(m[1]); mo = MONTHS[m[2]]; y = Number(m[3]); }
    else if ((m = /^([a-z]+)\.? (\d{1,2}),? (\d{4})$/.exec(text))) { d = Number(m[2]); mo = MONTHS[m[1]]; y = Number(m[3]); }
    if (!d || !mo || !y) return null;
    const day = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return validDay(day) ? day : null;
}
/** Next (direction 1) or previous (-1) day in a sorted catalogue relative to
 * `from`; stays on the edge when there is none. Without a catalogue, moves one
 * calendar day. */
export function stepDay(days: readonly string[], from: string, direction: 1 | -1): string {
    if (!days.length) return shiftDay(from, direction);
    if (direction > 0) return days.find(day => day > from) || days[days.length - 1];
    for (let i = days.length - 1; i >= 0; i--) if (days[i] < from) return days[i];
    return days[0];
}
/** The catalogue day closest to `target` (ties choose the later day). */
export function nearestDay(days: readonly string[], target: string): string | null {
    if (!days.length) return null;
    const t = Date.parse(target + 'T00:00:00Z');
    let best = days[0], gap = Infinity;
    for (const day of days) { const g = Math.abs(Date.parse(day + 'T00:00:00Z') - t); if (g <= gap) { best = day; gap = g; } }
    return best;
}
