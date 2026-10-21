import { CRS, latLngBounds, point } from 'leaflet';
import { useRef, useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';

import 'leaflet/dist/leaflet.css';
import './MapViewRoute.scss';

import { isDeveloperMode } from 'src/common/environment';
import { ImageHeight, ImageWidth, MaxNativeZoom, TileSize } from 'src/common/mapSettings';
import { BaseLayout } from 'src/components/BaseLayout';
import { Drawer } from 'src/components/Drawer';
import { EntityDatabaseExport } from 'src/components/EntityDatabaseExport';
import { EntityMenu } from 'src/components/EntityMenu';
import { MapBounds } from 'src/components/MapBounds';
import { MapCursorCoordinates } from 'src/components/MapCursorCoordinates';
import { MapEntities } from 'src/components/MapEntities';
import { MapPointCreation } from 'src/components/MapPointCreation';
import { ToolWindow } from 'src/components/ToolWindow';
import entityDatabase from 'src/data/entities.json';
import { addMapPoint } from 'src/helpers/addMapPoint';
import { removeMapPoint, updateMapPoint } from 'src/helpers/editMapPoint';
import { useEntityDatabase } from 'src/hooks/useEntityDatabase';
import { useEntityTreeVisibility } from 'src/hooks/useEntityTreeVisibility';
import { useUnsavedChangesWarning } from 'src/hooks/useUnsavedChangesWarning';
import type { MapEntity } from 'src/types/MapEntity';

// Tile (0, 0) is the image's top-left corner at every zoom level.
const bounds = latLngBounds(
  CRS.Simple.pointToLatLng(point(0, ImageHeight), MaxNativeZoom),
  CRS.Simple.pointToLatLng(point(ImageWidth, 0), MaxNativeZoom)
);

export function MapViewRoute() {
  const { database, setDatabase, hasUnsavedChanges, syncing, syncResult, syncDatabase } =
    useEntityDatabase(entityDatabase);

  const [entityToLocate, setEntityToLocate] = useState<MapEntity | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [iconBackground, setIconBackground] = useState(true);

  const cursorTargetRef = useRef<HTMLSpanElement>(null);

  useUnsavedChangesWarning(hasUnsavedChanges);
  const { visibleEntities, hiddenIds, toggleVisibility, showOnly, showEntity, resetVisibility } =
    useEntityTreeVisibility(database.entities);

  function locateEntity(entity: MapEntity) {
    // A new request locates the entity again even after manual map navigation.
    setEntityToLocate({ ...entity });
  }

  function browseEntity(entity: MapEntity) {
    showEntity(entity.id);

    locateEntity(entity);
  }

  const authorUrl = import.meta.env.VITE_AUTHOR_URL?.trim();

  return (
    <BaseLayout>
      <div className={`map-container${isDeveloperMode && !iconBackground ? ' map-container--icons-bare' : ''}`}>
        <MapContainer
          crs={CRS.Simple}
          minZoom={0}
          maxZoom={MaxNativeZoom}
          scrollWheelZoom={true}
          zoomControl={false}
          maxBounds={bounds}
          maxBoundsViscosity={1}
          bounds={bounds}
        >
          <MapBounds bounds={bounds} />
          {isDeveloperMode && <MapCursorCoordinates targetRef={cursorTargetRef} />}
          <MapEntities
            suggestionEntities={database.entities}
            entities={visibleEntities}
            entityToLocate={entityToLocate}
            onUpdatePoint={(entity) => setDatabase((current) => updateMapPoint(current, entity))}
            onDeletePoint={(id) => {
              setDatabase((current) => removeMapPoint(current, id));

              if (entityToLocate?.id === id) {
                setEntityToLocate(null);
              }
            }}
          />
          {isDeveloperMode && (
            <MapPointCreation
              suggestionEntities={database.entities}
              onAdd={(details, position) => {
                const result = addMapPoint(database, details, position);
                setDatabase(result.database);
                showEntity(result.entity.id, result.database.entities);
                locateEntity(result.entity);
              }}
            />
          )}
          <TileLayer
            attribution={
              authorUrl
                ? `&copy; <a title="${authorUrl}" href="${authorUrl}" target="_blank" rel="noopener">Author</a>`
                : undefined
            }
            url={`${import.meta.env.BASE_URL}images/map/tiles/{z}/{x}/{y}.png`}
            tileSize={TileSize}
            bounds={bounds}
            maxNativeZoom={MaxNativeZoom}
            noWrap={true}
            keepBuffer={2}
          />
        </MapContainer>
      </div>
      <Drawer
        title="Dark Devotion Map"
        subtitle={`v${import.meta.env.VITE_APP_VERSION}`}
        iconSrc={`${import.meta.env.BASE_URL}images/game.png`}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      >
        <EntityMenu
          entities={database.entities}
          hiddenIds={hiddenIds}
          onToggleVisibility={toggleVisibility}
          onShowOnly={showOnly}
          onResetVisibility={resetVisibility}
          onLocate={browseEntity}
        />
      </Drawer>
      {isDeveloperMode && (
        <ToolWindow
          title="Developer tools"
          warning={hasUnsavedChanges}
          status={
            <div className="map-status">
              <span className="map-status__count">
                {database.entities.length === 0
                  ? 'No entities have been added yet.'
                  : `${database.entities.length} ${database.entities.length === 1 ? 'entity' : 'entities'} loaded.`}
              </span>
              <span ref={cursorTargetRef} className="map-status__coordinates" />
            </div>
          }
        >
          <EntityDatabaseExport
            statusControl={
              <label className="map-icon-background" title="Show icon backgrounds and borders">
                <input
                  type="checkbox"
                  checked={iconBackground}
                  onChange={(event) => setIconBackground(event.currentTarget.checked)}
                />
                Icon BG
              </label>
            }
            database={database}
            hasUnsavedChanges={hasUnsavedChanges}
            syncing={syncing}
            syncResult={syncResult}
            onSync={syncDatabase}
          />
        </ToolWindow>
      )}
    </BaseLayout>
  );
}
