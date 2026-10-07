import { Composition } from 'remotion';
import { EmberFilm, FILM_FRAMES, FPS } from './EmberFilm';

export const RemotionRoot: React.FC = () => (
  <Composition id="EmberFilm" component={EmberFilm} durationInFrames={FILM_FRAMES} fps={FPS} width={1920} height={1080} />
);
