import * as moment from 'moment';
import { combineLatest, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { NetworkConfig } from '../../blockchain/config';
import { vulcan0x } from '../../blockchain/vulcan0x';
import { IntervalUnit } from '../allTrades/allTrades';
import { TradingPair } from '../tradingPair/tradingPair';

export interface PriceChartDataPoint {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  turnover: number;
}

export type GroupMode = 'byMonth' | 'byWeek' | 'byDay' | 'byHour';

export const groupModeMapper: { [key in GroupMode]: {addUnit: string, format: string} } = {
  byMonth: { addUnit: 'month', format: 'YY-MM' },
  byWeek: { addUnit: 'weeks', format: 'MM-DD' },
  byDay: { addUnit: 'days', format: 'MM-DD' },
  byHour: { addUnit: 'hours', format: 'HH:mm' },
};

export function loadAggregatedTrades(
  interval: number, unit: IntervalUnit,
  context$$: Observable<NetworkConfig>,
  onEveryBlock$$: Observable<number>,
  { base, quote }: TradingPair,
): Observable<PriceChartDataPoint[]> {
  const view = 'tradesAggregated';
  const options = { timeUnit: unit, tzOffset: { minutes: -new Date().getTimezoneOffset() } };
  const borderline = moment().subtract(interval, unit).startOf('day').toDate();
  const fields = ['date', 'open', 'close', 'min', 'max', 'volumeBase'];
  const filter = {
    market: { equalTo: `${base}${quote}` },
    date: { greaterThan: borderline.toISOString() },
  };

  return combineLatest(context$$, onEveryBlock$$).pipe(
    switchMap(([context]) =>
      vulcan0x(context.oasisDataService.url, view, options, filter, fields, undefined)
    ),
    map(aggrs => aggrs.map(parseAggregatedData)),
  );
}

function parseAggregatedData(
  { date, open, close, min, max, volumeBase }: any
): PriceChartDataPoint {
  return {
    open: Number(open),
    close: Number(close),
    low: Number(min),
    high: Number(max),
    turnover: Number(volumeBase),
    timestamp: new Date(date),
  };
}
