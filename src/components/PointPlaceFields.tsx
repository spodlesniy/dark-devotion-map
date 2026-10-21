import { useState } from 'react';

import { ChestVariantSelect } from 'src/components/ChestVariantSelect';
import { altarHasFaithCost } from 'src/helpers/altarHasFaithCost';
import { blockerTitles } from 'src/helpers/blockerTitles';
import { switchTitles } from 'src/helpers/switchTitles';
import { trapTitles } from 'src/helpers/trapTitles';
import type { MapPlaceDetails } from 'src/types/MapEntity';
import { MapPlaceAltarType } from 'src/types/MapPlaceAltarType';
import { MapPlaceBlockerType } from 'src/types/MapPlaceBlockerType';
import { MapPlaceSwitchType } from 'src/types/MapPlaceSwitchType';
import { MapPlaceTabletType } from 'src/types/MapPlaceTabletType';
import { MapPlaceTrapType } from 'src/types/MapPlaceTrapType';
import { MapPlaceType } from 'src/types/MapPlaceType';

type PointPlaceFieldsProps = {
  initialDetails: MapPlaceDetails | undefined;
  placeType: MapPlaceType;
  onPlaceTypeChange: (value: MapPlaceType) => void;
};

export function PointPlaceFields({ initialDetails, placeType, onPlaceTypeChange }: Readonly<PointPlaceFieldsProps>) {
  const [blockerType, setBlockerType] = useState(
    initialDetails?.placeType === MapPlaceType.Blocker ? initialDetails.blockerType : MapPlaceBlockerType.CrackedWall
  );
  const [switchType, setSwitchType] = useState(
    initialDetails?.placeType === MapPlaceType.Switch ? initialDetails.switchType : MapPlaceSwitchType.Lever
  );
  const [trapType, setTrapType] = useState(
    initialDetails?.placeType === MapPlaceType.Trap ? initialDetails.trapType : MapPlaceTrapType.Spear
  );
  const [altarType, setAltarType] = useState(
    initialDetails?.placeType === MapPlaceType.Altar ? initialDetails.altarType : MapPlaceAltarType.RunicAltar
  );
  const [altarFaithCost, setAltarFaithCost] = useState(
    initialDetails?.placeType === MapPlaceType.Altar && altarHasFaithCost(initialDetails.altarType)
      ? String(initialDetails.faithCost ?? '')
      : ''
  );

  return (
    <>
      <label>
        Place type
        <select
          name="placeType"
          value={placeType}
          onChange={(event) => onPlaceTypeChange(event.currentTarget.value as MapPlaceType)}
        >
          <option value={MapPlaceType.Chest}>Chest</option>
          <option value={MapPlaceType.Switch}>Switch</option>
          <option value={MapPlaceType.PrisonCell}>Prison cell</option>
          <option value={MapPlaceType.Trap}>Trap</option>
          <option value={MapPlaceType.Blocker}>Blocker</option>
          <option value={MapPlaceType.Tablet}>Tablet</option>
          <option value={MapPlaceType.Altar}>Altar</option>
          <option value={MapPlaceType.MirrorTeleporter}>Mirror teleporter</option>
          <option value={MapPlaceType.LostRoom}>Lost room</option>
        </select>
      </label>
      {placeType === MapPlaceType.Switch && (
        <label>
          Switch type
          <select
            name="switchType"
            value={switchType}
            onChange={(event) => setSwitchType(event.currentTarget.value as MapPlaceSwitchType)}
          >
            {Object.values(MapPlaceSwitchType).map((value) => (
              <option key={value} value={value}>
                {switchTitles[value]}
              </option>
            ))}
          </select>
        </label>
      )}
      {placeType === MapPlaceType.Chest && (
        <ChestVariantSelect
          initialValue={initialDetails?.placeType === MapPlaceType.Chest ? initialDetails.variant : 1}
        />
      )}
      {placeType === MapPlaceType.Trap && (
        <label>
          Trap type
          <select
            name="trapType"
            value={trapType}
            onChange={(event) => setTrapType(event.currentTarget.value as MapPlaceTrapType)}
          >
            {Object.values(MapPlaceTrapType).map((value) => (
              <option key={value} value={value}>
                {trapTitles[value]}
              </option>
            ))}
          </select>
        </label>
      )}
      {placeType === MapPlaceType.Blocker && (
        <>
          <label>
            Blocker type
            <select
              name="blockerType"
              value={blockerType}
              onChange={(event) => setBlockerType(event.currentTarget.value as MapPlaceBlockerType)}
            >
              {Object.values(MapPlaceBlockerType).map((value) => (
                <option key={value} value={value}>
                  {blockerTitles[value]}
                </option>
              ))}
            </select>
          </label>
          {blockerType === MapPlaceBlockerType.FaithLock && (
            <label>
              Faith cost
              <input
                autoComplete="off"
                name="faithCost"
                type="number"
                min="0"
                step="any"
                required
                defaultValue={
                  initialDetails?.placeType === MapPlaceType.Blocker &&
                  initialDetails.blockerType === MapPlaceBlockerType.FaithLock
                    ? initialDetails.faithCost
                    : ''
                }
              />
            </label>
          )}
        </>
      )}
      {placeType === MapPlaceType.Tablet && (
        <label>
          Tablet type
          <select
            name="tabletType"
            defaultValue={
              initialDetails?.placeType === MapPlaceType.Tablet ? initialDetails.tabletType : MapPlaceTabletType.Faith
            }
          >
            <option value={MapPlaceTabletType.Faith}>Faith</option>
            <option value={MapPlaceTabletType.Damage}>Damage</option>
            <option value={MapPlaceTabletType.Crit}>Crit</option>
            <option value={MapPlaceTabletType.Stamina}>Stamina</option>
          </select>
        </label>
      )}
      {placeType === MapPlaceType.Altar && (
        <>
          <label>
            Altar type
            <select
              name="altarType"
              value={altarType}
              onChange={(event) => {
                const nextType = event.currentTarget.value as MapPlaceAltarType;
                setAltarType(nextType);

                if (!altarHasFaithCost(nextType)) {
                  setAltarFaithCost('');
                }
              }}
            >
              <option value={MapPlaceAltarType.RunicAltar}>Runic altar</option>
              <option value={MapPlaceAltarType.BlessingAltar}>Blessing altar</option>
              <option value={MapPlaceAltarType.HealingStatue}>Healing statue</option>
              <option value={MapPlaceAltarType.DiseasePurgingStatue}>Disease purging statue</option>
              <option value={MapPlaceAltarType.TeleportationAltar}>Teleportation altar</option>
              <option value={MapPlaceAltarType.FaithStatue}>Faith statue</option>
              <option value={MapPlaceAltarType.AltarOfTheMagnanimous}>Altar of the Magnanimous</option>
              <option value={MapPlaceAltarType.StrangeAltar}>Strange altar</option>
              <option value={MapPlaceAltarType.AltarOfRedemption}>Altar of redemption</option>
              <option value={MapPlaceAltarType.ImpiousAltar}>Impious altar</option>
            </select>
          </label>
          {altarHasFaithCost(altarType) && (
            <label>
              Faith cost
              <input
                autoComplete="off"
                name="faithCost"
                type="number"
                min="0"
                step="any"
                value={altarFaithCost}
                onChange={(event) => setAltarFaithCost(event.currentTarget.value)}
              />
            </label>
          )}
        </>
      )}
    </>
  );
}
