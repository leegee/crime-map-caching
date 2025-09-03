import CrimeMap from "./components/CrimeMap";
import Loading from "./components/Loading";
import Controls from "./Menu";

export default function App() {
  return <main class="reponsive">
    <CrimeMap />
    <Loading />
    <Controls />
  </main >
}
