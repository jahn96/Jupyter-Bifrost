import {
  vegaParamPredicatesList,
  VegaParamPredicate,
  VegaAggregation,
} from './VegaEncodings';
import { GraphSpec, EncodingInfo } from '../hooks/bifrost-model';

const filterTypes = new Set<string>(vegaParamPredicatesList);

interface AggFunc {
  (encoding: EncodingInfo): string;
}
const vegaAggToPd: { [vegaAgg: string]: string | AggFunc } = {
  count: 'count',
  valid: (encoding) =>
    `$df.join($df.dropna().groupby(group_fields).count()["${encoding.field}"], on=group_fields, rsuffix=" valid count")`,
  missing: (encoding) =>
    `$df.join($df.groupby(group_fields)["${encoding.field}"].apply(lambda x: x.isnull().sum()), on=group_fields, rsuffix=" missing")`,
  distinct: (encoding) =>
    `$df.join($df.dropna().groupby(group_fields).unique()["${encoding.field}"], on=group_fields, rsuffix=" distinct")`,
  sum: 'sum',
  product: 'prod',
  mean: 'mean',
  variance: 'var',
  variancep: (encoding) =>
    `$df.join($df.groupby(group_fields).var(ddof=0)["${encoding.field}"], on=group_fields, rsuffix=" population variance")`,
  stdev: 'std',
  stdevp: (encoding) =>
    `$df.join($df.groupby(group_fields).std(ddof=0)["${encoding.field}"], on=group_fields, rsuffix=" population std")`,
  stderr: (encoding) =>
    `$df.join($df.groupby(group_fields).sem()["${encoding.field}"], on=group_fields, rsuffix=" stderr")`,
  median: 'median',
  min: 'min',
  max: 'max',
};

export default class VegaPandasTranslator {
  private getQueryFromFilter(filterConfig: any): string {
    return Object.keys(filterConfig)
      .filter((key) => filterTypes.has(key))
      .map((filterType) => {
        let query: string;
        switch (filterType as VegaParamPredicate) {
          case 'gte':
            query = `($df['${filterConfig.field}'] >= ${filterConfig.gte})`;
            break;
          case 'lte':
            query = `($df['${filterConfig.field}'] <= ${filterConfig.lte})`;
            break;
          case 'range':
            // Expects number range like {range: [0, 5]}.
            query = `($df['${filterConfig.field}'] >= ${filterConfig.range[0]}) & ($df['${filterConfig.field}'] <= ${filterConfig.range[1]})`;
            break;
          case 'oneOf':
            query = `($df['${filterConfig.field}'].isin([${filterConfig.oneOf
              .map((str: string) => `"${str}"`)
              .toString()}]))`;
            break;

          default:
            query = '';
            break;
        }
        return query;
      })
      .join('&');
  }

  private getFilterFromTransform(transform: GraphSpec['transform']) {
    return transform
      .map((t) => {
        const compoundOperator =
          'or' in t.filter ? 'or' : 'and' in t.filter ? 'and' : null;
        if (compoundOperator) {
          // Handle compound query ex. "and", "or", "not"
          const connector = compoundOperator === 'or' ? '|' : '&';
          const compFilters = t.filter[compoundOperator].map(
            this.getQueryFromFilter
          );
          let query = compFilters.join(connector);
          if (compFilters.length > 1) {
            query = '(' + query + ')';
          }
          return query;
        } else {
          return this.getQueryFromFilter(t.filter);
        }
      })
      .join('&');
  }

  private getAggregations(encodings: GraphSpec['encoding']) {
    const encodingVals = Object.values(encodings);
    return encodingVals
      .filter((encoding) => 'aggregate' in encoding)
      .map((encoding) => {
        const agg = vegaAggToPd[encoding.aggregate as VegaAggregation];
        const otherEncodedFields = encodingVals
          .filter((otherEncoding) => otherEncoding !== encoding)
          .map((otherEncoding) => `"${otherEncoding.field}"`);
        const pandasGroupFields = `group_fields = [${otherEncodedFields.toString()}]`;
        if (typeof agg === 'string') {
          return [
            pandasGroupFields,
            `$df = $df.join($df.groupby(group_fields).agg("${agg}")["${encoding.field}"], on=group_fields, rsuffix=" ${agg}")`,
          ].join('\n');
        } else {
          return [pandasGroupFields, `$df = ${agg(encoding)}`].join('\n');
        }
      })
      .join('\n');
  }

  convertSpecToCode(spec: GraphSpec) {
    // Filters
    const filterQuery = this.getFilterFromTransform(spec.transform);
    const filteredDs = filterQuery.length ? `$df = $df[${filterQuery}]` : '';
    // Aggregators
    const aggregations = this.getAggregations(spec.encoding);
    // Check
    const code = [filteredDs, aggregations].join('\n');

    const isAlphaNum = /\w/;

    return isAlphaNum.test(code) ? code : '$df';
  }
}
