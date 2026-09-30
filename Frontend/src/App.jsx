import { Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AllRoutes } from './lib/routes';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <>
      <Toaster position="top-center" />

      <Routes>
        {AllRoutes.map(
          ({ path, element: Element, isProtected, role }, index) => (
            <Route
              key={index}
              path={path}
              element={
                isProtected ? (
                  <ProtectedRoute role={role}>
                    <Element />
                  </ProtectedRoute>
                ) : (
                  <Element />
                )
              }
            />
          )
        )}
      </Routes>
    </>
  );
}

export default App;