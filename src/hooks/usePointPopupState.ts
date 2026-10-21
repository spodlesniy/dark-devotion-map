import type { Layer } from 'leaflet';
import { type RefObject, useEffect, useEffectEvent, useState } from 'react';

type PopupEvents = { onPopupOpen: (() => void) | undefined; onPopupClose: (() => void) | undefined };

export function usePointPopupState(
  layerRef: RefObject<Layer | null>,
  { onPopupOpen, onPopupClose }: Readonly<PopupEvents>
) {
  const [open, setOpen] = useState(false);

  const handleOpen = useEffectEvent(() => {
    setOpen(true);
    onPopupOpen?.();
  });
  const handleClose = useEffectEvent(() => {
    setOpen(false);
    onPopupClose?.();
  });

  useEffect(() => {
    const layer = layerRef.current;

    if (!layer) {
      return;
    }

    let opened = false;
    const onOpen = () => {
      opened = true;
      handleOpen();
    };
    const onClose = () => {
      opened = false;
      handleClose();
    };
    // The source layer outlives conditional popup components during movement.
    layer.on('popupopen', onOpen);
    layer.on('popupclose', onClose);

    return () => {
      layer.off('popupopen', onOpen);
      layer.off('popupclose', onClose);

      if (opened) {
        handleClose();
      }
    };
  }, [layerRef]);

  return open;
}
