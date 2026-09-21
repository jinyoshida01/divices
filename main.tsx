import {createRoot} from "react-dom/client";
import DivicesWorkspace from "./components/divices-workspace";
import "./app/globals.css";
import "./app/divices.css";

createRoot(document.getElementById("root")!).render(<DivicesWorkspace/>);
