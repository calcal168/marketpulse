export type NewsSource =
  | 'Yahoo'
  | 'Yahoo Finance'
  | 'Nasdaq'
  | 'Sina Finance'
  | 'Eastmoney'
  | 'Tencent Finance'
  | 'NetEase Finance'
  | '36Kr'
  | 'Moomoo/Futu'
  | 'BBC'
  | 'BBC中文'
  | 'CNA'
  | '新浪'
  | 'Bloomberg'
  | 'AlJazeera'
  | 'Google News';

export type ArticleFilter = 'All' | NewsSource;
