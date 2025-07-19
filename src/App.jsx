import { BrowserRouter, Routes, Route } from "react-router-dom";
import Authentication from "./Authentication";
import Dashboard from "./Dashboard";

function App(){
  return(
    <BrowserRouter>
      <Routes>
        <Route path="/" index element={<Authentication />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App