import { Blocks, User } from 'lucide-react';
import '../../styles/home.css';

interface HomeScreenProps {
  onPickPacks(): void;
  onPickSkins(): void;
}

export function HomeScreen({ onPickPacks, onPickSkins }: HomeScreenProps) {
  return (
    <div className="home">
      <div className="home-intro">
        <h1>Resource Pack Studio</h1>
        <p>Two tools in one window. Pick what you want to work on.</p>
      </div>

      <div className="home-cards">
        <button className="home-card home-card-packs" onClick={onPickPacks}>
          <div className="home-card-icon">
            <Blocks size={36} />
          </div>
          <div className="home-card-title">Resource Packs</div>
          <div className="home-card-desc">
            Edit textures, animations, and pack metadata. Export a <code>.zip</code> for
            Minecraft.
          </div>
          <div className="home-card-cta">Open Pack Studio →</div>
        </button>

        <button className="home-card home-card-skins" onClick={onPickSkins}>
          <div className="home-card-icon">
            <User size={36} />
          </div>
          <div className="home-card-title">Player Skins</div>
          <div className="home-card-desc">
            Design a 64×64 skin on Steve or Alex. Export a single <code>.png</code> for
            NameMC or a server.
          </div>
          <div className="home-card-cta">Open Skin Studio →</div>
        </button>
      </div>
    </div>
  );
}