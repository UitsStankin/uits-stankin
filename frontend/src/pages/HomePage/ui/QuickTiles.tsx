import { Link } from 'react-router';

import { QUICK_TILES, type QuickTile } from '../lib/quickTiles';
import { AnchorLink } from './AnchorLink';

function TileBody({ tile }: { tile: QuickTile }) {
  const Icon = tile.icon;

  return (
    <>
      <span className="u-tile-icon" aria-hidden>
        <Icon size={18} />
      </span>
      {tile.title}
    </>
  );
}

export function QuickTiles() {
  return (
    <section className="u-wrap u-tiles-sec" aria-label="Быстрые ссылки">
      <ul className="u-tiles">
        {QUICK_TILES.map((tile) => (
          <li key={tile.key}>
            {tile.to ? (
              <Link to={tile.to} className="u-tile">
                <TileBody tile={tile} />
              </Link>
            ) : (
              <AnchorLink target={tile.anchor ?? ''} className="u-tile">
                <TileBody tile={tile} />
              </AnchorLink>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
