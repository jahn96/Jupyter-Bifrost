/** @jsx jsx */
import { jsx, css } from '@emotion/react';

import React, { useState, useRef } from 'react';
import SearchBar from '../ui-widgets/SearchBar';

import { Query } from 'compassql/build/src/query/query';
import { Lock, X } from 'react-feather';
import { useEffect } from 'react';
import { EncodingQuery } from 'compassql/build/src/query/encoding';

import {
  useModelState,
  SuggestedGraphs,
  Args,
} from '../../hooks/bifrost-model';
import Pill from '../ui-widgets/Pill';
import { useMemo } from 'react';
import { BifrostTheme } from '../../theme';
import { data2schema, schema2asp, cql2asp } from 'draco-core';
import Draco from 'draco-vis';
import produce from 'immer';

const columnSelectorCss = (theme: BifrostTheme) => css`
  width: 320px;
  margin-right: 30px;
  padding-right: 30px;
  border-right: 1px solid #cecece;
  h2,
  h3 {
    margin: 0;
  }

  .choice {
    display: flex;
    margin: 5px 0;
    padding: 5px;
    width: fit-content;
    border-left: 2px solid transparent;

    &.focused {
      border-left: 2px solid ${theme.color.primary.standard};
    }
  }

  input[type='checkbox'] {
    all: unset;
    width: 13px;
    height: 13px;
    display: inline-block;
    cursor: pointer;
    border: 1px solid #aaa;
    border-radius: 20%;
    margin-right: 6px;
  }

  input[type='checkbox']:disabled {
    cursor: default;
  }

  input[type='checkbox']:checked {
    background: #771c79;
  }

  input[type='checkbox']:checked::after {
    position: absolute;
    color: white;
    content: '✓';
    padding-left: 1px;
    line-height: 1;
  }

  input[type='checkbox']:focus-visible {
    outline: auto;
  }

  form {
    margin-top: 12px;
  }

  fieldset {
    max-height: 270px;
    overflow: auto;
    border: none;
  }

  .column-tags {
    padding: 0px;
    display: flex;
    flex-wrap: wrap;
  }

  .tag-content-wrapper {
    display: flex;
    justify-content: space-between;
    white-space: nowrap;
    overflow: hidden;
    align-items: center;
  }

  .tag-content-wrapper button {
    border: none;
    width: 20px;
    height: 20px;
    background-color: #dedede;
    color: var(--jp-widgets-color);
    border-radius: 50%;
    cursor: pointer;
    padding: 0px;
    margin: 0;
  }

  .tag-content-wrapper button:hover {
    background-color: #eee;
  }
`;
export default function ColumnSelectorSidebar(props: { plotArgs: Args }) {
  const [query, setQuery] = useState('');
  const columnChoices = useModelState('df_columns')[0];
  const [selectedColumns, setSelectedColumns] =
    useModelState('selected_columns');
  const columnTypes = useModelState('column_types')[0];
  const spec = useModelState('query_spec')[0];
  const data = useModelState('graph_data')[0];
  const setSuggestedGraphs = useModelState('suggested_graphs')[1];

  const [results, setResults] = useState(
    columnChoices.map((choice, index) => ({ choice, index }))
  );
  const optionsRef = useRef<HTMLFieldSetElement>(null);

  const preSelectedColumns = useMemo(
    () => new Set(Object.values(props.plotArgs).filter(Boolean)),
    [props.plotArgs]
  );

  // Ensure that pre-selected columns are included on initial render.
  useEffect(() => {
    if (selectedColumns.length) {
      return;
    }
    setSelectedColumns(Array.from(preSelectedColumns));
  }, []);

  // Create charts whenever the column selection changes
  useEffect(recommendCharts, [selectedColumns]);

  function recommendCharts() {
    const dataSchema = data2schema(data);
    const dataAsp = schema2asp(dataSchema);

    const selectedEncodings = Array.from(selectedColumns).map((column) => {
      if (preSelectedColumns.has(column)) {
        return spec.spec.encodings.filter(
          (encoding: any) => encoding['field'] === column
        )[0];
      }
      return {
        field: column,
        type: columnTypes[column],
        channel: '?',
      } as EncodingQuery;
    });

    const preRecommendedSpecs: Query[] = [];
    if (selectedEncodings.length > 3) {
      const fixedEncoding = selectedEncodings.filter(
        (encoding) => encoding.channel !== '?'
      );
      const nonFixedEncoding = selectedEncodings.filter(
        (encoding) => encoding.channel === '?'
      );

      for (let i = 0; i < nonFixedEncoding.length - 1; i++) {
        const encodings = [
          ...fixedEncoding,
          ...nonFixedEncoding.slice(i, i + 2),
        ];
        preRecommendedSpecs.push({
          spec: { ...spec.spec, encodings: encodings },
        });
      }
    } else {
      preRecommendedSpecs.push({
        spec: { ...spec.spec, encodings: selectedEncodings },
      });
    }

    const queryAsps = preRecommendedSpecs.map((spec) => {
      return cql2asp(spec.spec);
    });

    const draco = new Draco();

    draco.init().then(() => {
      const queryAsp = queryAsps[0];
      const program = 'data("data").\n' + dataAsp.concat(queryAsp).join('\n');
      const solution = draco.solve(program, { models: 5 });

      if (solution) {
        const recommendedSpecs = solution.specs.map((spec) =>
          produce(spec, (gs) => {
            delete gs['$schema'];
            delete (gs['data'] as any).url;
            gs['data']['name'] = 'data';
            gs['transform'] = [];
            gs.width = 400;
            gs.height = 200;
          })
        );
        setSuggestedGraphs(recommendedSpecs as SuggestedGraphs);
      }
    });
  }

  function handleCheckboxChange(e: React.ChangeEvent<HTMLInputElement>) {
    const updatedSet = new Set(selectedColumns);
    if (e.target.checked && selectedColumns.length > 2) {
      e.target.checked = false;
      return;
    }
    if (e.target.checked) {
      updatedSet.add(e.target.value);
    } else {
      updatedSet.delete(e.target.value);
    }
    setSelectedColumns(Array.from(updatedSet));
  }

  function handleDelete(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    const updatedSet = new Set(selectedColumns);
    const selectedTag = (e.currentTarget as HTMLButtonElement).className.split(
      '_'
    )[1];

    updatedSet.delete(selectedTag);

    const choice = document.getElementsByClassName(
      `choice_${selectedTag}`
    )[0] as HTMLInputElement;
    choice.checked = false;

    setSelectedColumns(Array.from(updatedSet));
  }

  return (
    <aside className="ColumnSelectorSidebar" css={columnSelectorCss}>
      <h2>Columns</h2>
      <h3 className="subtitle">Select up to 3 columns</h3>
      <ul className="column-tags">
        {Array.from(selectedColumns).map((column: string, i) => {
          return (
            <Pill key={column} style={{ margin: 4, padding: 4 }}>
              <div className="tag-content-wrapper">
                <span style={{ padding: '0px 5px', fontSize: 12 }}>
                  {column}
                </span>
                <button
                  className={`tagButton_${column}`}
                  onClick={handleDelete}
                >
                  <X size={10} />
                </button>
              </div>
            </Pill>
          );
        })}
      </ul>
      <SearchBar
        data-immediate-focus
        data-focusable="search"
        choices={columnChoices}
        value={query}
        onChange={setQuery}
        onResultsChange={setResults}
      />

      <form onSubmit={(e) => e.preventDefault()}>
        <fieldset ref={optionsRef}>
          {results.map(({ choice: col }, i) => {
            return (
              <label className="choice" data-focusable key={col}>
                {preSelectedColumns.has(col) ? (
                  <Lock size={15} style={{ marginRight: '6px' }} />
                ) : (
                  <input
                    className={`choice_${col}`}
                    type="checkbox"
                    value={col}
                    onChange={handleCheckboxChange}
                    checked={selectedColumns.includes(col)}
                    // disabled={
                    //   selectedColumns.length > 2 &&
                    //   !selectedColumns.includes(col)
                    // }
                  />
                )}
                {col}
              </label>
            );
          })}
        </fieldset>
      </form>
    </aside>
  );
}
