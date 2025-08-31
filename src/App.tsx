import CrimeMap from "./components/CrimeMap";
import Loading from "./components/Loading";
import Controls from "./components/controls";

export default function App() {
  return <main>
    <Loading />
    <CrimeMap />
    <Controls />
  </main>
}
