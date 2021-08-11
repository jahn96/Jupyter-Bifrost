/**@jsx jsx */
import { jsx, css } from '@emotion/react';
import { X, Sliders, CheckSquare } from 'react-feather';
import theme from '../../theme';
import NumericalIcon from '../../assets/NumericalIcon';
import CategoryIcon from '../../assets/CategoryIcon';
import FunnelIcon from '../../assets/FilterIcon';
import AggregateIcon from '../../assets/AggregateIcon';
import SliderIcon from '../../assets/icons/SliderIcon';
import ScaleIcon from '../../assets/icons/ScaleIcon';
import { Fragment } from 'react';

const typeIconMap: Record<string, typeof NumericalIcon> = {
  quantitative: NumericalIcon,
  nominal: CategoryIcon,
};

const filterIconMap: Record<string, any> = {
  quantitative: SliderIcon,
  nominal: () => <CheckSquare size={12} />,
};

interface GraphPillProps extends React.LiHTMLAttributes<HTMLLIElement> {
  onClose: () => void;
  onAggregationSelected: () => void;
  onFilterSelected: () => void;
  onEncodingSelected: () => void;
  onFieldSelected: () => void;
  position: number;
  type: string;
  encoding: string;
  filters: string[];
  aggregation: string;
  scale: string;
  field: string;
}
export default function GraphPill(props: GraphPillProps) {
  const {
    onClose,
    position,
    type,
    encoding,
    field,
    filters,
    aggregation,
    scale,
    ...rest
  } = props;
  const color = theme.color.pill[position % theme.color.pill.length];
  const TypeIcon = type in typeIconMap ? typeIconMap[type] : FunnelIcon;
  const FilterIcon = type in filterIconMap ? filterIconMap[type] : FunnelIcon;

  const borderRaidus = '5px';

  const graphPillCss = css`
    list-style: none;
    background: white;
    border-radius: ${borderRaidus};
    width: min-content;
    margin: 5px;
    box-shadow: ${theme.shadow.handle};

    .pill-header {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 20px;
      background-color: ${color};
      border-radius: ${borderRaidus};
      overflow: hidden;
      span {
        white-space: nowrap;
        margin: 0 5px;
        cursor: pointer;

        &.tag {
          width: 50px;
          height: 16px;
          background-color: ${theme.color.primary.light};
          border-radius: ${borderRaidus};
        }

        &:hover {
          text-decoration: underline;
        }
      }
      .divider {
        height: 30px;
        width: 2px;
        color: rgba(0, 0, 0, 0.6);
      }
    }

    .options {
      display: flex;
      align-items: start;
      .slider-button {
        border-radius: 0 15px 15px 0;
        background-color: ${theme.color.primary.dark};
        padding: 5px;
      }
    }

    .modifiers {
      display: grid;
      grid-template-columns: auto 1fr;
      justify-content: start;
      align-items: start;

      padding: 8px;

      button.wrapper {
        background-color: transparent;
        transition: background-color 0.3s;
        height: 1em;
        width: 1em;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 4px;
        margin-bottom: -2px;
        &:hover {
          background-color: ${theme.color.primary.light};
        }
      }

      .filter-list {
        list-style: none;
        padding: 0 5px;
        li {
          margin-bottom: 7px;
          padding: 0;
          white-space: nowrap;
          &:last-child {
            margin-bottom: 0;
          }
        }
      }
    }
  `;

  return (
    <li css={graphPillCss} {...rest}>
      <div className="pill-header">
        <TypeIcon />
        <div className="divider"></div>
        <span onClick={props.onEncodingSelected}>{encoding}</span>
        <div className="divider"></div>
        <span onClick={props.onFieldSelected} className={field ? '' : 'tag'}>
          <b>{field}</b>
        </span>
        <button className="wrapper" onClick={onClose}>
          <X size={15} />
        </button>
      </div>
      <div className="options">
        <button className="slider-button" onClick={props.onFilterSelected}>
          <Sliders size={15} color="white" />
        </button>
        <div className="modifiers">
          {!!filters.length && (
            <Fragment>
              <button className="wrapper" onClick={props.onFilterSelected}>
                <FilterIcon />
              </button>
              <ul className="filter-list">
                {filters.map((filter) => (
                  <li>{filter}</li>
                ))}
              </ul>
            </Fragment>
          )}

          {aggregation && (
            <Fragment>
              <button className="wrapper" onClick={props.onFilterSelected}>
                <AggregateIcon />
              </button>
              <div style={{ padding: '0 5px' }}>{aggregation}</div>
            </Fragment>
          )}

          {scale && (
            <Fragment>
              <button className="wrapper" onClick={props.onAggregationSelected}>
                <ScaleIcon />
              </button>
              <div style={{ padding: '0 5px' }}>{scale}</div>
            </Fragment>
          )}
        </div>
      </div>
    </li>
  );
}
