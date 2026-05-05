import { Article } from '@/models/Article';
import { NewsCategory } from '@/models/NewsCategory';

type ArticleSeed = Pick<Article, 'title' | 'summary'>;

const categoryRules: Array<[NewsCategory, RegExp]> = [
  ['Health', /\b(health|healthcare|hospital|doctor|medicine|medical|drug|vaccine|covid|disease|cancer|mental health|who)\b|健康|医疗|医院|医生|药|疫苗|疾病/],
  ['Tech', /\b(tech|technology|ai|artificial intelligence|software|app|chip|semiconductor|nvidia|apple|microsoft|google|meta|tesla|robot|cyber|data)\b|科技|人工智能|芯片|半导体|软件|数据|机器人/],
  ['Economic', /\b(economy|economic|inflation|gdp|recession|jobs|unemployment|fed|central bank|interest rate|tariff|trade|supply chain|housing)\b|经济|通胀|利率|央行|就业|关税|贸易|房地产/],
  ['Financial', /\b(finance|financial|stock|stocks|market|markets|shares|earnings|revenue|profit|ipo|nasdaq|dow|s&p|bond|yield|crypto|bitcoin|oil|gold)\b|金融|股市|股票|市场|财报|利润|债券|收益率|黄金|原油|比特币/],
  ['Political', /\b(politics|political|government|president|minister|election|vote|congress|senate|court|law|policy|war|military|diplomat|sanction)\b|政治|政府|总统|部长|选举|国会|法院|政策|战争|制裁/],
  ['People', /\b(people|celebrity|actor|actress|singer|artist|athlete|sports|family|life|dies|death|wedding|profile|interview)\b|人物|名人|演员|歌手|运动员|生活|去世|采访/],
];

export function categorizeArticle(article: ArticleSeed, fallback: NewsCategory = 'Financial'): NewsCategory {
  const text = `${article.title} ${article.summary ?? ''}`.toLowerCase();
  const match = categoryRules.find(([, pattern]) => pattern.test(text));
  return match?.[0] ?? fallback;
}
