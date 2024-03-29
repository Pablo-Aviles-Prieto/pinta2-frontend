import { FC } from 'react';
import { useGameData } from '../../hooks/useGameData';
import { useSocket } from '../../hooks/useSocket';

interface Props {
  turnCount: number | undefined;
}

export const WordContainer: FC<Props> = ({ turnCount }) => {
  const { gameState, isDrawer } = useGameData();
  const { socket } = useSocket();

  const userAlreadyScored = () => {
    return Object.keys(gameState.turnScores ?? {}).includes(socket?.id ?? '');
  };

  const convertWordToArray = (word: string) => {
    return word.split('').map((char) => {
      if (char === ' ') return '\u00A0';
      if (char === '*') return '_';
      return char;
    });
  };

  return (
    <div className='flex items-center justify-center'>
      <div className='px-4 py-1 m-auto text-2xl border-2 rounded-lg shadow-lg border-emerald-300 bg-gradient-to-tl from-amber-50 via-orange-50 to-amber-50'>
        <p className='text-base italic text-center underline'>
          {gameState.category}
        </p>
        <div className={`flex items-center justify-center gap-4`}>
          <p className='font-bold w-[45px]'>{turnCount}</p>
          {gameState.currentWord && gameState.cryptedWord && (
            <p className='flex gap-[1px]'>
              {isDrawer || userAlreadyScored()
                ? convertWordToArray(gameState.currentWord).map((char, i) => (
                    <span key={char + i}>{char}</span>
                  ))
                : convertWordToArray(gameState.cryptedWord).map((char, i) => (
                    <span
                      className={`${char !== '_' && 'text-emerald-600'}`}
                      key={char + i}
                    >
                      {char}
                    </span>
                  ))}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
