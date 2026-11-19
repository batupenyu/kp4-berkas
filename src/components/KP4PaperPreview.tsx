import React from 'react';
import { buildKP4Blocks, KP4Block, KP4Data } from '../types/kp4';

interface KP4PaperPreviewProps {
  data: KP4Data;
  zoom?: number;
}

function renderBlock(b: KP4Block, idx: number): React.ReactNode {
  if (b.t === 'c') {
    return (
      <p key={idx} className="c">
        {b.x}
      </p>
    );
  }
  if (b.t === 'kv') {
    return (
      <div key={idx} className="kv">
        <span>{b.k}</span>
        <span>:</span>
        <span>{b.v}</span>
      </div>
    );
  }
  if (b.t === 'p') {
    return (
      <p key={idx} className={b.b ? 'b' : 'jp'}>
        {b.x}
      </p>
    );
  }
  if (b.t === 'li') {
    return (
      <div key={idx} className={`li${b.l ? ' l1' : ''}`}>
        <span>{b.n}</span>
        <span>{b.x}</span>
      </div>
    );
  }
  if (b.t === 'amt') {
    return (
      <div key={idx} className="amt">
        <span>{b.n}</span>
        <span>{b.k}</span>
        <span>{b.v}</span>
      </div>
    );
  }
  if (b.t === 'tbl') {
    const sm = b.w.reduce((a, c) => a + c, 0);
    return (
      <table key={idx} className={b.sm ? 'sm' : undefined}>
        <colgroup>
          {b.w.map((w, ci) => (
            <col key={ci} style={{ width: `${((w / sm) * 100).toFixed(1)}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {b.h.map((h, hi) => (
              <th key={hi}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {b.r.length === 0 ? (
            <tr>
              <td colSpan={b.h.length}>-</td>
            </tr>
          ) : (
            b.r.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci}>{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    );
  }
  if (b.t === 'sign') {
    const renderCol = (arr: string[]) => (
      <div>
        {arr.map((line, i) => (
          <div key={i}>{i === 5 ? <b>{line || '\u00A0'}</b> : line || '\u00A0'}</div>
        ))}
      </div>
    );
    return (
      <div key={idx} className="sign">
        {renderCol(b.l)}
        {renderCol(b.r)}
      </div>
    );
  }
  return null;
}

export const KP4PaperPreview: React.FC<KP4PaperPreviewProps> = ({ data, zoom = 1 }) => {
  const blocks = buildKP4Blocks(data);
  const pgIdx = blocks.findIndex((b) => b.t === 'pg');
  const page1 = pgIdx >= 0 ? blocks.slice(0, pgIdx) : blocks;
  const page2 = pgIdx >= 0 ? blocks.slice(pgIdx + 1) : [];

  return (
    <div
      className="origin-top-left print:transform-none"
      style={
        zoom !== 1
          ? {
              transform: `scale(${zoom})`,
              width: `${100 / zoom}%`,
            }
          : undefined
      }
    >
      <div id="paperWrap">
        <div id="paper">
          <div className="pg">{page1.map((b, i) => renderBlock(b, i))}</div>
          {page2.length > 0 && (
            <div className="pg pg2">{page2.map((b, i) => renderBlock(b, i + 1000))}</div>
          )}
        </div>
      </div>
    </div>
  );
};
