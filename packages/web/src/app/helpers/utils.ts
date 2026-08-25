import {format} from 'date-fns';

export function setDayHours(numOfHours, date, op) {
  if (op === '+'){
    date.setHours(date.getHours() + numOfHours);
  }
  return date;
}
export function antiMergeObjectArray(a, b, key) {
  a.forEach(ai => {
     b.forEach((bi, bindex) => {
       if (ai[key] === bi[key]){
         b.splice(bindex, 1);
       }
     });
  });
  return a.concat(b);
}
export function customFormatDate(date: any, formatType: string){
  return format(new Date(date), formatType);
}
export function daysInMonth (month, year) {
  const date = new Date(year, month, 0, 5);
  return date.getDate();
}
export function dayByWeek (date) {
  return date.getDay();
}

export function getWeekDays() {
  return {
    0: 'weekdays.sunday',
    1: 'weekdays.monday',
    2: 'weekdays.tuesday',
    3: 'weekdays.wednesday',
    4: 'weekdays.thursday',
    5: 'weekdays.friday',
    6: 'weekdays.saturday'
  };
}
export function getDaysArray(start, end) {
  const arr = [];
  for (const dt = new Date(start); dt <= new Date(end); dt.setDate(dt.getDate() + 1)){
    arr.push(new Date(dt));
  }
  return arr;
}
