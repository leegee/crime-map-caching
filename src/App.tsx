import CrimeMap from "./components/CrimeMap";
import Loading from "./components/Loading";
import Controls from "./Menu";

export default function App() {
  return <main class="reponsive" style="height: 100vh">
    <CrimeMap />
    <Loading />
    <Controls />
  </main >
}
