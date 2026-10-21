import { Route, Routes } from 'react-router';

import { RouteList } from 'src/routes/constants';
import { MapViewRoute } from 'src/routes/MapViewRoute';
import { NotFoundRoute } from 'src/routes/NotFoundRoute';

export function BaseRoutes() {
  return (
    <Routes>
      <Route path="*" element={<NotFoundRoute />} />

      <Route path={RouteList.map} element={<MapViewRoute />} />
    </Routes>
  );
}
