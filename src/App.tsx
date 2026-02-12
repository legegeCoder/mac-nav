import { useState } from 'react'
import { useNavConfig } from './hooks/useNavConfig'
import { useSettings } from './hooks/useSettings'
import { useClock } from './hooks/useClock'
import BgDecoration from './components/BgDecoration/BgDecoration'
import MenuBar from './components/MenuBar/MenuBar'
import Welcome from './components/Welcome/Welcome'
import SearchBar from './components/SearchBar/SearchBar'
import CategorySection from './components/CategorySection/CategorySection'
import Dock from './components/Dock/Dock'
import SettingsPanel from './components/SettingsPanel/SettingsPanel'
import './styles/global.css'

export default function App() {
  const { config, updateConfig, resetConfig, exportYaml, importYaml } = useNavConfig()
  const { cardStyle, setCardStyle, iconStyle, setIconStyle } = useSettings()
  const { greeting } = useClock()
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <>
      <BgDecoration />
      <MenuBar items={config.menuBar.items} />

      <main style={{ position: 'relative', zIndex: 1, padding: '80px 40px 140px', maxWidth: 1400, margin: '0 auto' }}>
        <Welcome
          greeting={greeting}
          name={config.greeting.name}
          subtitle={config.greeting.subtitle}
        />
        <SearchBar isLaunchpad={cardStyle === 'launchpad'} />
        {config.categories.map((cat) => (
          <CategorySection
            key={cat.title}
            category={cat}
            cardStyle={cardStyle}
            iconStyle={iconStyle}
          />
        ))}
      </main>

      <Dock
        items={config.dock.items}
        utilities={config.dock.utilities}
        onSettingsClick={() => setSettingsOpen(true)}
      />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        cardStyle={cardStyle}
        iconStyle={iconStyle}
        setCardStyle={setCardStyle}
        setIconStyle={setIconStyle}
        config={config}
        updateConfig={updateConfig}
        resetConfig={resetConfig}
        exportYaml={exportYaml}
        importYaml={importYaml}
      />
    </>
  )
}
