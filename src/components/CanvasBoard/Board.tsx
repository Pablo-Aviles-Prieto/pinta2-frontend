import { FC, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import Konva from 'konva';
import { useSocket } from '../../hooks/useSocket';
import { Chat } from '../Chat';
import { useModal } from '../../hooks/useModal';
import { useGameData } from '../../hooks/useGameData';
import type {
  GameStateI,
  UserRoomI,
  LinesI,
  ChatMsgsI,
} from '../../interfaces';
import { useTurnCounter } from '../../hooks/useTurnCounter';
import { useGenericTimer } from '../../hooks/useGenericTimer';
import { PreTurnCountDown } from '../PreTurnCountDown';
import { UserList } from '../UserList/UserList';
import {
  DEFAULT_CATEGORY_SELECTED,
  DEFAULT_TURN_DURATION,
  MAX_POINTS_IN_SINGLE_ARRAY,
} from '../../utils/const';
import { useCustomToast } from '../../hooks/useCustomToast';
import { GuessedWord } from '../GuessedWord';
import { DrawingPanel } from './DrawingPanel';
import { getBase64SVGURL } from '../../utils';
import { UserBoard } from '../UserList/UserBoard';
import { CopyBtnComponent } from '../Styles/CopyBtn';
import { BtnContainer } from '../Styles/BtnContainer';
import { Pinta2BoardLogo } from './Pinta2BoardLogo';
import { WordContainer } from './WordContainer';
import { ChipContainer } from '../Styles/ChipContainer';
import { TextAreaChips } from '../TextAreaChips';
import { WordCountDown } from '../WordCountDown';
import { GameConfigCountDown } from '../GameConfigCountDown';

interface Props {
  setAwaitPlayersMsg: React.Dispatch<React.SetStateAction<string | undefined>>;
  setGameCancelled: React.Dispatch<React.SetStateAction<string | undefined>>;
  setSelectingWord: React.Dispatch<React.SetStateAction<string | undefined>>;
  setConfiguringGame: React.Dispatch<React.SetStateAction<string | undefined>>;
}

interface JoinRoomDirectlyResponse {
  success: boolean;
  newUsers?: UserRoomI[];
  isPlaying?: boolean;
  gameState?: GameStateI;
}

// TODO: Print in the chat whenever a new game is started
export const Board: FC<Props> = ({
  setAwaitPlayersMsg,
  setGameCancelled,
  setSelectingWord,
  setConfiguringGame,
}) => {
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [lines, setLines] = useState<LinesI[]>([]);
  const [drawColor, setDrawColor] = useState('#000000');
  const [pencilStroke, setPencilStroke] = useState(7);
  const [eraserStroke, setEraserStroke] = useState(17);
  const [possibleCategories, setPossibleCategories] = useState<string[]>([]);
  const [possibleTurnDuration, setPosibleTurnDuration] = useState<
    Record<string, number>
  >({});
  const [possibleWords, setPossibleWords] = useState<string[]>([]);
  const [canvasCursorStyle, setCanvasCursorStyle] = useState(`auto`);
  const [displayGuessedWord, setDisplayGuessedWord] = useState(false);
  const [copied, setCopied] = useState(false);
  const [guessedMsgDisplayed, setGuessedMsgDisplayed] = useState<
    string | undefined
  >(undefined);
  const [chatMsgs, setChatMsgs] = useState<ChatMsgsI[]>([]);
  const [introducedWords, setIntroducedWords] = useState<string[]>([]);
  const [haveCustomWords, setHaveCustomWords] = useState<boolean>(false);
  const isDrawing = useRef(false);
  const countdownAudioRef = useRef<HTMLAudioElement>(null);
  const lastTenSecondsAudioRef = useRef<HTMLAudioElement>(null);
  const guessedWordAudioRef = useRef<HTMLAudioElement>(null);
  const endTurnAudioRef = useRef<HTMLAudioElement>(null);
  const endGameAudioRef = useRef<HTMLAudioElement>(null);
  const handleSelectWordCountRef = useRef<((boolean: boolean) => void) | null>(
    null
  );
  const handleConfigGameCounterRef = useRef<
    ((boolean: boolean) => void) | null
  >(null);
  const { socket, joinedRoom, roomPassword, setIsRegistered, setUsername } =
    useSocket();
  const { showToast } = useCustomToast();
  const {
    RenderModal: ModalOwnerCategories,
    closeModal: closeModalOwner,
    openModal: openModalOwner,
  } = useModal();
  const {
    RenderModal: SelectWordsModal,
    closeModal: closeWordsModal,
    openModal: openWordsModal,
  } = useModal();
  const {
    gameState,
    userList,
    categorySelected,
    turnDuration,
    isDrawer,
    isPlaying,
    setUserList,
    setCategorySelected,
    setGameState,
    setTurnDuration,
    setIsDrawer,
    setIsPlaying,
    setUsersNotPlaying,
  } = useGameData();
  const {
    count: turnCount,
    startCounter: startTurnCounter,
    setStartCounter: setTurnStartCounter,
    resetCounterState: resetTurnCounter,
  } = useTurnCounter({
    onCountDownComplete: () => {
      if (isDrawer) {
        socket?.emit('turn finished', { roomNumber: joinedRoom });
      }
    },
  });
  const {
    count: preTurnCount,
    startCounter: preTurnStartCounter,
    handleCounterState: handlePreTurnCounter,
  } = useGenericTimer({
    initTimerValue: 3,
    onCountDownComplete: () => {
      if (isDrawer) {
        socket?.emit('starting turn', { roomNumber: joinedRoom });
      }
    },
  });
  const {
    RenderModal: ScoreBoardModal,
    closeModal: closeScoreBoardModal,
    openModal: openScoreBoardModal,
  } = useModal();
  const {
    count: scoreBoardCounter,
    handleCounterState: handleScoreBoardCount,
  } = useGenericTimer({
    initTimerValue: 5,
    onCountDownComplete: () => {
      if (isDrawer) {
        socket?.emit('scoreboard finished', { roomNumber: joinedRoom });
      }
      closeScoreBoardModal();
    },
  });
  const {
    RenderModal: EndGameModal,
    closeModal: closeEndGameModal,
    openModal: openEndGameModal,
    setContent: setEndGameContent,
  } = useModal();
  const { handleCounterState: handleGuessedWordCounter } = useGenericTimer({
    initTimerValue: 3,
    onCountDownComplete: () => {
      setDisplayGuessedWord(false);
    },
  });

  const getPercentage = ({
    num,
    percentage,
  }: {
    num: number;
    percentage: number;
  }) => Math.floor((num * percentage) / 100);

  useEffect(() => {
    if (preTurnCount === 3 && countdownAudioRef.current) {
      countdownAudioRef.current.volume = 0.3;
      countdownAudioRef.current.play();
    }
  }, [preTurnCount]);

  useEffect(() => {
    if (turnCount === 10 && lastTenSecondsAudioRef.current) {
      lastTenSecondsAudioRef.current.volume = 0.2;
      lastTenSecondsAudioRef.current.play();
    }

    const currentGameState = useGameData.getState().gameState;
    if (!currentGameState.turnDuration || !isDrawer) return;
    const turnDuration = currentGameState.turnDuration / 1000;

    const sendCheckForCluesEvent = (percentage: number) => {
      socket?.emit('check for clues', {
        roomNumber: joinedRoom,
        percentageRemaining: percentage,
      });
    };

    if (turnCount === getPercentage({ num: turnDuration, percentage: 75 })) {
      sendCheckForCluesEvent(75);
    }
    if (turnCount === getPercentage({ num: turnDuration, percentage: 50 })) {
      sendCheckForCluesEvent(50);
    }
    if (turnCount === getPercentage({ num: turnDuration, percentage: 25 })) {
      sendCheckForCluesEvent(25);
    }
  }, [turnCount]);

  useEffect(() => {
    if (!socket) return;

    socket.on(
      'pre turn drawer',
      ({ possibleWords }: { possibleWords: string[] }) => {
        setPossibleWords(possibleWords);
        openWordsModal();
      }
    );

    // Not using the msg property in this component, that comes from this event
    socket.on('game cancelled', () => {
      setTurnStartCounter(false);
      if (handleSelectWordCountRef.current) {
        handleSelectWordCountRef.current(false);
      }
    });

    return () => {
      socket.off('pre turn drawer');
      socket.off('game cancelled');
    };
  }, [handleSelectWordCountRef]);

  useEffect(() => {
    if (!socket) return;

    socket.on(
      'pre game owner',
      ({
        categories,
        possibleTurnDurations,
      }: {
        categories: string[];
        possibleTurnDurations: Record<string, number>;
      }) => {
        closeEndGameModal(); // in case it is opened from a restart game
        setPossibleCategories(categories);
        setPosibleTurnDuration(possibleTurnDurations);
        openModalOwner();
        const gameStateCategory = useGameData.getState().categorySelected;
        if (gameStateCategory === 'Personalizada' || !gameStateCategory) {
          setCategorySelected(DEFAULT_CATEGORY_SELECTED);
        }
      }
    );

    return () => {
      socket.off('pre game owner');
    };
  }, [haveCustomWords]);

  useEffect(() => {
    if (!socket) return;

    socket.on(
      'guessed word',
      ({
        msg,
        totalScores,
        turnScores,
        updatedTime,
      }: {
        id: string;
        msg: string;
        totalScores: GameStateI['totalScores'];
        turnScores: GameStateI['turnScores'];
        updatedTime: number;
      }) => {
        const {
          VITE_USER_SYSTEM_NAME: userSystemName,
          VITE_USER_SYSTEM_ID: userSystemID,
          VITE_USER_SYSTEM_COLOR: userSystemColor,
        } = import.meta.env;
        const currentGameState = useGameData.getState().gameState;
        setGameState({ ...currentGameState, totalScores, turnScores });
        resetTurnCounter(updatedTime);
        setChatMsgs((prevMsgs) => [
          ...prevMsgs,
          {
            id: userSystemID,
            user: userSystemName,
            msg,
            color: userSystemColor,
          },
        ]);
        // In chrome is not getting sometimes the displayGuessedWord correct value from
        // useState, but it does from the cb function of the setter
        setDisplayGuessedWord((displayGuessedWord) => {
          if (!displayGuessedWord && guessedWordAudioRef.current) {
            guessedWordAudioRef.current.volume = 0.1;
            guessedWordAudioRef.current.play();
          }
          return displayGuessedWord;
        });
      }
    );

    socket.on('show scoreboard', () => {
      setTurnStartCounter(false);
      openScoreBoardModal();
      handleScoreBoardCount(true);
      if (!displayGuessedWord && endTurnAudioRef.current) {
        if (guessedWordAudioRef.current) {
          guessedWordAudioRef.current.volume = 0;
        }
        endTurnAudioRef.current.volume = 0.4;
        endTurnAudioRef.current.play();
      }
    });

    socket.on('game ended', ({ owner }: { owner: string }) => {
      const currentGameState = useGameData.getState().gameState;
      const TopMsg =
        owner === socket.id ? (
          <div className='mb-4'>
            <div className='w-[170px] mb-2'>
              <BtnContainer
                extraStyles='!py-1'
                onClickHandler={() => {
                  socket?.emit('restart game', {
                    roomNumber: joinedRoom,
                  });
                }}
              >
                <p>Volver a jugar</p>
              </BtnContainer>
            </div>
            <h1 className='text-lg font-bold text-teal-900'>
              Partida terminada! La palabra era{' '}
              <span className='text-xl text-teal-600'>
                {currentGameState.currentWord}
              </span>
            </h1>
          </div>
        ) : (
          <>
            <h1 className='mb-2 text-lg font-bold text-teal-900'>
              Partida terminada! La palabra era{' '}
              <span className='text-xl text-teal-600'>
                {currentGameState.currentWord}
              </span>
            </h1>
            <h1 className='mb-6 text-lg font-bold text-teal-900'>
              Esperando a que el lider decida...
            </h1>
          </>
        );
      setGameState({ ...currentGameState, endGame: true });
      setTurnStartCounter(false);
      setEndGameContent(TopMsg);
      openEndGameModal();
      if (!displayGuessedWord && endGameAudioRef.current) {
        if (guessedWordAudioRef.current) {
          guessedWordAudioRef.current.volume = 0;
        }
        endGameAudioRef.current.volume = 0.2;
        endGameAudioRef.current.play();
      }
    });

    return () => {
      socket.off('guessed word');
      socket.off('show scoreboard');
      socket.off('game ended');
    };
  }, [displayGuessedWord]);

  useEffect(() => {
    setIsDrawer(socket?.id === gameState.drawer?.id);
  }, [socket?.id, gameState.drawer?.id]);

  useEffect(() => {
    if (!socket) return;

    socket.on(
      'update user list',
      ({
        newUsers,
        action,
        msg,
        newUser,
        gameState: newGameState,
      }: {
        newUsers: UserRoomI[];
        action: string;
        msg: string;
        newUser?: UserRoomI;
        gameState?: GameStateI;
      }) => {
        setUserList(newUsers);

        if (action === 'join') {
          if (newGameState) {
            setGameState(newGameState);
          }

          const currentGameState =
            newGameState ?? useGameData.getState().gameState;
          const currentUserList = useGameData.getState().userList;
          const currentusersNotPlaying = useGameData.getState().usersNotPlaying;

          // Storing the new user in the array state
          if (
            newUser &&
            currentGameState.started &&
            !currentGameState.endGame &&
            !currentGameState.preTurn
          ) {
            setUsersNotPlaying([...currentusersNotPlaying, newUser.id]);
          }

          // if there is newUser joining, we check if there is drawer, in that case the drawer
          // will hydrate the new user, if it doesnt exist, it will get the 1st user in the array
          // (should be the owner), and hydrate the new user
          if (
            newUser &&
            ((currentGameState.drawer?.id &&
              socket?.id === currentGameState.drawer?.id) ||
              (!currentGameState.drawer?.id &&
                socket?.id === currentUserList[0]?.id))
          ) {
            socket.emit('hydrate new player', {
              newUser,
              turnCount,
              draw: lines,
              roomNumber: joinedRoom,
            });
          }

          showToast({ msg, options: { type: 'info' } });
        } else {
          showToast({ msg, options: { type: 'warning' } });
        }
      }
    );

    return () => {
      socket.off('update user list');
    };
  }, [turnCount, lines]);

  useEffect(() => {
    if (!socket) return;

    // Separate the useEffect, to listen to isPlaying changes
    socket.on('countdown preDraw start', () => {
      const currentGameState = useGameData.getState().gameState;
      if (currentGameState.preTurn) {
        setGameState({ ...currentGameState, preTurn: false });
      }
      if (isPlaying) {
        setIsPlaying(false);
      }
      handlePreTurnCounter(true);
      clearBoard();
      setUsersNotPlaying([]);
      setSelectingWord(undefined);
    });

    return () => {
      socket.off('countdown preDraw start');
    };
  }, [socket, isPlaying]);

  useEffect(() => {
    const cursorDataURL = getBase64SVGURL(drawColor);
    setCanvasCursorStyle(`url(${cursorDataURL}) 5 5,  auto`);
    if (!socket) return;

    socket.on('new segment', (lineNumber: number, lineSegment: LinesI) => {
      setLines((lines) => {
        const updatedLines = [...lines];
        if (updatedLines[lineNumber]) {
          updatedLines[lineNumber].points = lineSegment.points;
        } else {
          updatedLines.push({ ...lineSegment });
        }
        return updatedLines;
      });
    });

    socket.on('clear board', () => {
      setLines([]);
    });

    socket.on('pre turn no drawer', ({ message }: { message: string }) => {
      setSelectingWord(message);
    });

    socket.on(
      'update game state front',
      ({ gameState }: { gameState: GameStateI }) => {
        setGameState(gameState);
      }
    );

    socket.on(
      'countdown turn',
      ({ usersGuessing }: { usersGuessing: number }) => {
        const currentGameState = useGameData.getState().gameState;
        const currentTurnDuration = useGameData.getState().turnDuration;
        // update the usersGuessing
        setGameState({
          ...currentGameState,
          usersGuessing,
        });
        resetTurnCounter(currentTurnDuration ?? DEFAULT_TURN_DURATION);
        setTurnStartCounter(true);
      }
    );

    // Set the turn duration to all users in the room except for the leader
    socket.on(
      'set new turn duration',
      ({ turnDuration }: { turnDuration: number }) => {
        setTurnDuration(turnDuration / 1000);
      }
    );

    socket.on('close endgame modal', () => {
      closeEndGameModal();
    });

    // Set the category to all users in the room except for the leader
    socket.on('update category front', ({ category }: { category: string }) => {
      setCategorySelected(category);
    });

    // update the EndGameModal content if the owner left during endGame
    socket.on('resend game ended', ({ owner }: { owner: string }) => {
      const currentGameState = useGameData.getState().gameState;
      const UpdateMsg =
        owner === socket.id ? (
          <div className='mb-4'>
            <div className='w-[170px] mb-2'>
              <BtnContainer
                extraStyles='!py-1'
                onClickHandler={() => {
                  socket?.emit('restart game', {
                    roomNumber: joinedRoom,
                  });
                }}
              >
                <p>Volver a jugar</p>
              </BtnContainer>
            </div>
            <h1 className='text-lg font-bold text-teal-900'>
              Partida terminada! La palabra era{' '}
              <span className='text-xl text-teal-600'>
                {currentGameState.currentWord}
              </span>
            </h1>
          </div>
        ) : (
          <>
            <h1 className='mb-2 text-lg font-bold text-teal-900'>
              Partida terminada! La palabra era{' '}
              <span className='text-xl text-teal-600'>
                {currentGameState.currentWord}
              </span>
            </h1>
            <h1 className='mb-6 text-lg font-bold text-teal-900'>
              Esperando a que el lider decida...
            </h1>
          </>
        );
      setEndGameContent(UpdateMsg);
    });

    // update the counter and the lines for a user who joined in the middle of the turn
    socket.on(
      'current game data',
      ({
        turnCount,
        draw,
        usersNotPlaying,
      }: {
        turnCount: number | undefined;
        draw: LinesI[];
        usersNotPlaying: string[];
      }) => {
        const currentGameState = useGameData.getState().gameState;
        if (
          turnCount &&
          currentGameState.started &&
          !currentGameState.preTurn
        ) {
          resetTurnCounter(turnCount);
          setTurnStartCounter(true);
        }

        // Storing the new user in the array state
        if (
          currentGameState.started &&
          !currentGameState.endGame &&
          !currentGameState.preTurn
        ) {
          // For new users, this is the latest event recieved when joining a room
          // since has a timeout of 300ms on the back, so has the usersNotPlaying up to date
          setUsersNotPlaying([...usersNotPlaying, socket.id]);
        }
        setLines(draw);
      }
    );

    // display the msg in the middle of the screen (msg & fireworks used on GuessedWord component)
    socket.on('user guessed', ({ msg }: { msg: string }) => {
      setGuessedMsgDisplayed(msg);
      setDisplayGuessedWord(true);
      handleGuessedWordCounter(true);
    });

    socket.on('disconnect', () => {
      setIsRegistered(false);
      setUsername('');
      // TODO: navigate to path '/' with a state prop 'notRegistered' in the navigate
      // should be already re-directed with that states changeds
    });

    socket.on(
      'join room directly response',
      ({
        success,
        gameState,
        isPlaying,
        newUsers,
      }: JoinRoomDirectlyResponse) => {
        if (success) {
          // if the game started, set the turnDuration for future turns
          if (gameState && gameState.started) {
            setTurnDuration(
              gameState.turnDuration
                ? gameState.turnDuration / 1000
                : DEFAULT_TURN_DURATION
            );
          }
          newUsers && setUserList(newUsers);
          gameState && setGameState(gameState);
          isPlaying && setIsPlaying(isPlaying);
          if (isPlaying) {
            socket.emit('update users not playing', {
              roomNumber: joinedRoom,
            });
          }
        }
      }
    );

    socket.on('update lines state', ({ lines }: { lines: LinesI[] }) => {
      setLines(lines);
    });

    return () => {
      socket.off('new segment');
      socket.off('clear board');
      socket.off('pre turn no drawer');
      socket.off('update game state front');
      socket.off('countdown turn');
      socket.off('set new turn duration');
      socket.off('close endgame modal');
      socket.off('update category front');
      socket.off('resend game ended');
      socket.off('current game data');
      socket.off('user guessed');
      socket.off('disconnect');
      socket.off('join room directly response');
      socket.off('update lines state');
    };
  }, []);

  const handleTurnDuration = (turnDuration: number) => {
    setTurnDuration(turnDuration / 1000); // parsing it to seconds
  };

  const handleCategoryChoice = (category: string) => {
    setCategorySelected(category);
  };

  const handleStartDrawing = (e: Konva.KonvaEventObject<MouseEvent>) => {
    isDrawing.current = true;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    setLines([
      ...lines,
      {
        tool,
        points: [pos.x, pos.y],
        color: drawColor,
        strokeWidth: tool === 'pen' ? pencilStroke : eraserStroke,
      },
    ]);
  };

  const handleMouseEnter = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.buttons === 1) {
      if (
        !e.target ||
        (gameState.started && gameState.drawer?.id !== socket?.id)
      ) {
        return;
      }
      handleStartDrawing(e);
    }
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!e.target || !isDrawer) {
      return;
    }
    handleStartDrawing(e);
  };

  // TODO: Can improve performance, since if the user wnat to fill an area drawing a lot of lines
  // in the same section, it creates a lot of data in the lines array, specially if the user does it
  // on a canvas edge, creating tons of new arrays
  // IMPORTANT 1 possible solution is to expand the canvas, but the drawing area (visible area where the lines
  // are going to be displayed) is a bit less than the whole canvas, so if the user try to fill an area
  // near corners, i could manage it as a single line, since theorically the user didnt leave the canvas
  // only left the drawing/visible area, so it doesnt create hundred of unnecessary new lines
  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // no drawing - skipping
    if (
      !e.target ||
      !isDrawing.current ||
      (gameState.started && gameState.drawer?.id !== socket?.id)
    ) {
      return;
    }

    const stage = e.target.getStage();
    const point = stage?.getPointerPosition();
    if (!point) return;

    // Logic under the setter setLines, to get the updated prevLines
    setLines((prevLines) => {
      const newLines = [...prevLines];
      const lastLine = newLines[newLines.length - 1];

      // If lastLine has reached the limit, start a new line
      if (lastLine.points.length >= MAX_POINTS_IN_SINGLE_ARRAY) {
        const newLine = {
          ...lastLine,
          // Add the last point of the old line as the first point of the new line to avoid a gap
          points: [...lastLine.points.slice(-2), point.x, point.y],
        };
        newLines.push(newLine);
        socket?.emit('new segment', {
          lineLength: newLines.length - 1,
          lineSegment: newLine,
          roomNumber: joinedRoom,
        });
      } else {
        // add point to the existing line
        lastLine.points = lastLine.points.concat([point.x, point.y]);
        // replace the last line in newLines with the updated lastLine
        newLines[newLines.length - 1] = lastLine;
        socket?.emit('new segment', {
          lineLength: newLines.length - 1,
          lineSegment: lastLine,
          roomNumber: joinedRoom,
        });
      }

      return newLines;
    });
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  const clearBoard = () => {
    setLines([]);
    socket?.emit('clear board', { roomNumber: joinedRoom });
  };

  const handleStartGame = () => {
    if (!categorySelected || userList.length < 3) {
      showToast({
        msg: 'Se necesitan al menos 3 jugadores',
        options: { type: 'error' },
      });
      return;
    }
    if (haveCustomWords && introducedWords.length < userList.length * 3 * 2) {
      showToast({
        content: (
          <p>
            Con la cantidad de usuarios conectados, se necesitan al menos{' '}
            <span className='font-bold text-red-500'>
              {userList.length * 3 * 2}
            </span>{' '}
            palabras.
          </p>
        ),
        options: { type: 'error', autoClose: 4000 },
      });
      return;
    }

    socket?.emit('init game', {
      roomNumber: joinedRoom,
      turnDuration: (turnDuration ?? 120) * 1000,
      categorySelected,
      customWords: haveCustomWords ? introducedWords : undefined,
    });
    closeModalOwner();
    if (handleConfigGameCounterRef.current) {
      handleConfigGameCounterRef.current(false);
    }
    // removing possible messages when starting the game
    setAwaitPlayersMsg(undefined);
    setGameCancelled(undefined);
    setHaveCustomWords(false);
  };

  const handleAwaitMorePlayers = () => {
    socket?.emit('await more players', { roomNumber: joinedRoom });
    closeModalOwner();
    if (handleConfigGameCounterRef.current) {
      handleConfigGameCounterRef.current(false);
    }
  };

  const handleUndo = () => {
    setLines((prevLines) => {
      const newLinesState =
        prevLines.length > 0 ? prevLines.slice(0, -1) : prevLines;
      socket?.emit('update drawing lines', {
        roomNumber: joinedRoom,
        draw: newLinesState,
      });
      return newLinesState;
    });
  };

  const handleInitGame = () => {
    if (userList.length < 3) {
      showToast({
        msg: 'Se necesitan al menos 3 jugadores para iniciar una partida!',
        options: { type: 'error' },
      });
      return;
    }
    socket?.emit('send pre game', { roomNumber: joinedRoom });
  };

  return (
    // TODO: Disable the input when user is in turnScore so he cant keep chatting ???
    // TODO: Add a restart game button for the owner (it should display a modal to confirm the action)!
    // TODO: Check that when pressing a link on the header, it doesnt navigate right away, should
    // alert the user
    // TODO: Add a footer with my details IMPORTANT
    <>
      {/* Audio section */}
      <audio
        ref={countdownAudioRef}
        src='/audios/countdown-3secs.mp3'
        preload='auto'
      ></audio>
      <audio
        ref={lastTenSecondsAudioRef}
        src='/audios/bell-alert.mp3'
        preload='auto'
      ></audio>
      <audio
        ref={guessedWordAudioRef}
        src='/audios/bell-guessed-word.mp3'
        preload='auto'
      ></audio>
      <audio
        ref={endTurnAudioRef}
        src='/audios/xylophone-turn-end.mp3'
        preload='auto'
      ></audio>
      <audio
        ref={endGameAudioRef}
        src='/audios/tada.mp3'
        preload='auto'
      ></audio>
      {/* TODO: Extract into a component (BoardHeader) IMPORTANT */}
      <div className='flex items-end justify-between gap-2 mb-1 w-[1280px]'>
        {/* Turn&Round/init game btn container */}
        <div className='w-[137px]'>
          {gameState.started && (
            <div className='p-3 px-0 text-sm text-center border rounded-lg border-emerald-500 bg-gradient-to-tl from-amber-50 via-orange-50 to-amber-50'>
              <p>
                Ronda{' '}
                <span className='mr-2 text-base font-bold text-emerald-600'>
                  {gameState.round}
                </span>
                Turno{' '}
                <span className='text-base font-bold text-emerald-600'>
                  {gameState.turn !== undefined && gameState.turn + 1}
                </span>
              </p>
            </div>
          )}
          {!gameState.started && userList[0]?.id === socket?.id && (
            <BtnContainer onClickHandler={handleInitGame}>
              <p>Iniciar juego</p>
            </BtnContainer>
          )}
        </div>
        {/* Word container & DrawingPanel */}
        <div className='min-h-[68px]'>
          {gameState.started && !gameState.preTurn && startTurnCounter && (
            <WordContainer turnCount={turnCount} />
          )}
        </div>
        {/* CopyBtn container */}
        <div className='w-[266px]'>
          <CopyBtnComponent
            copied={copied}
            joinedRoom={joinedRoom ?? 9999}
            roomPassword={roomPassword}
            setCopied={setCopied}
          />
        </div>
      </div>
      <div className='relative mx-auto flex gap-2 w-[1280px] h-[600px]'>
        <UserBoard extraStyles='w-[144px] h-full' />
        <Stage
          width={858}
          height={600}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseEnter={handleMouseEnter}
          className='bg-white border rounded-lg shadow-lg border-emerald-500'
          style={{
            cursor: isDrawer ? canvasCursorStyle : 'auto',
          }}
        >
          <Pinta2BoardLogo />
          <Layer>
            {lines.map((line, i) => (
              <Line
                key={i}
                points={line.points}
                stroke={line.color ?? '#df4b26'}
                strokeWidth={line.strokeWidth}
                tension={0.5}
                lineCap='round'
                lineJoin='round'
                globalCompositeOperation={
                  line.tool === 'eraser' ? 'destination-out' : 'source-over'
                }
              />
            ))}
          </Layer>
        </Stage>
        <div
          className='bg-gradient-to-b from-amber-50 via-neutral-50 to-amber-50
           border border-emerald-500 rounded-lg shadow-lg w-[278px] h-full'
        >
          <Chat
            joinedRoom={joinedRoom}
            turnCount={turnCount}
            chatMsgs={chatMsgs}
            setChatMsgs={setChatMsgs}
          />
        </div>
        {preTurnStartCounter && !gameState.preTurn && (
          <PreTurnCountDown preTurnCount={preTurnCount} />
        )}
      </div>
      {isDrawer && (
        <div className='flex items-end justify-between gap-2 mt-1 w-[1280px]'>
          <div className='w-[137px]' />
          <DrawingPanel
            color={drawColor}
            pencilStroke={pencilStroke}
            eraserStroke={eraserStroke}
            setColor={setDrawColor}
            setPencilStroke={setPencilStroke}
            setEraserStroke={setEraserStroke}
            tool={tool}
            setTool={setTool}
            setCanvasCursorStyle={setCanvasCursorStyle}
            clearBoard={clearBoard}
            handleUndo={handleUndo}
          />
          <div className='w-[266px]' />
        </div>
      )}
      {!gameState.started && (
        <ModalOwnerCategories forbidClose>
          <>
            <div className='flex justify-between'>
              <div className='w-[18px]' />
              <h1 className='text-xl font-bold text-center text-teal-800'>
                Configura la partida!
              </h1>
              <div className='font-bold text-teal-600'>
                <GameConfigCountDown
                  haveCustomWords={haveCustomWords}
                  closeModalOwner={closeModalOwner}
                  setAwaitPlayersMsg={setAwaitPlayersMsg}
                  setGameCancelled={setGameCancelled}
                  setSelectingWord={setSelectingWord}
                  setConfiguringGame={setConfiguringGame}
                  setHaveCustomWords={setHaveCustomWords}
                  setHandleConfigGameCounter={(handle) => {
                    handleConfigGameCounterRef.current = handle;
                  }}
                />
              </div>
            </div>
            {!haveCustomWords && (
              <div className='my-6'>
                <h3 className='mb-1 text-lg underline underline-offset-2 decoration-2 decoration-teal-500'>
                  Selecciona una categoría!
                </h3>
                <div className='flex gap-2'>
                  {possibleCategories.map((cat) => (
                    <ChipContainer
                      key={cat}
                      selectedCondition={categorySelected === cat}
                      onClick={() => handleCategoryChoice(cat)}
                    >
                      <>{cat}</>
                    </ChipContainer>
                  ))}
                </div>
              </div>
            )}
            <div className='my-6'>
              <h3 className='mb-1 text-lg underline decoration-2 underline-offset-2 decoration-teal-500'>
                Elige cuantos segundos tendréis por turno!
              </h3>
              <div className='flex gap-2'>
                {Object.entries(possibleTurnDuration).map(([key, value]) => (
                  <ChipContainer
                    key={key}
                    selectedCondition={turnDuration === value / 1000}
                    onClick={() => handleTurnDuration(value)}
                  >
                    <>{value / 1000}s</>
                  </ChipContainer>
                ))}
              </div>
            </div>
            <div className='my-6'>
              <h3 className='mb-1 text-lg underline decoration-2 underline-offset-2 decoration-teal-500'>
                ¿Quieres usar palabras personalizadas?
              </h3>
              <div className='flex items-center gap-2 mb-3'>
                <input
                  className='w-4 h-4 cursor-pointer'
                  type='checkbox'
                  value='customWords'
                  id='customWords'
                  checked={haveCustomWords}
                  onChange={() => {
                    setHaveCustomWords((prevState) => {
                      if (!handleConfigGameCounterRef.current) {
                        return !prevState;
                      }
                      if (prevState) {
                        handleConfigGameCounterRef.current(true);
                      } else {
                        handleConfigGameCounterRef.current(true);
                      }
                      return !prevState;
                    });
                  }}
                />
                <div className='flex items-center justify-between w-full'>
                  <label htmlFor='customWords' className='cursor-pointer'>
                    Usar palabras personalizadas
                  </label>
                  <>
                    {haveCustomWords && (
                      <span
                        className={`text-xs ${
                          introducedWords.length < userList.length * 3 * 2
                            ? 'text-red-600'
                            : 'text-teal-500'
                        }`}
                      >
                        {introducedWords.length}/{userList.length * 3 * 2}{' '}
                        Palabras
                      </span>
                    )}
                  </>
                </div>
              </div>
              {haveCustomWords && (
                <>
                  <TextAreaChips
                    introducedWords={introducedWords}
                    setIntroducedWords={setIntroducedWords}
                    hasError={introducedWords.length < userList.length * 3 * 2}
                  />
                  <p className='text-xs italic opacity-60'>
                    Puedes eliminar o editar (haciendo doble click) las palabras
                  </p>
                </>
              )}
            </div>
            <div className='my-6'>
              <h3 className='text-lg underline decoration-2 underline-offset-2 decoration-teal-500'>
                Usuarios conectados:
              </h3>
              <ul className='flex gap-2'>
                {userList.map((user, i) => (
                  <li key={user.id}>
                    <span className='text-lg text-emerald-500'>
                      {user.name}
                    </span>
                    {i !== userList.length - 1 && ','}
                  </li>
                ))}
              </ul>
            </div>
            <div className='flex items-center justify-between gap-24'>
              <BtnContainer
                onClickHandler={handleAwaitMorePlayers}
                extraStyles='!py-[6px]'
              >
                <p>Esperar más jugadores</p>
              </BtnContainer>
              <BtnContainer
                onClickHandler={handleStartGame}
                extraStyles='!py-[6px]'
              >
                <p>Empezar la partida</p>
              </BtnContainer>
            </div>
          </>
        </ModalOwnerCategories>
      )}
      {gameState.started && gameState.preTurn && (
        <SelectWordsModal forbidClose>
          <div>
            <div className='flex justify-between'>
              <h1 className='mb-4 text-xl font-bold text-teal-800'>
                Selecciona una palabra:
              </h1>
              <div className='font-bold text-teal-600'>
                <WordCountDown
                  possibleWords={possibleWords}
                  closeWordsModal={closeWordsModal}
                  setHandleSelectWordCount={(handle) => {
                    handleSelectWordCountRef.current = handle;
                  }}
                />
              </div>
            </div>
            <div className='flex gap-4'>
              {possibleWords.map((word) => (
                <ChipContainer
                  key={word}
                  onClick={() => {
                    socket?.emit('set drawer word', {
                      roomNumber: joinedRoom,
                      word,
                    });
                    closeWordsModal();
                    if (handleSelectWordCountRef.current) {
                      handleSelectWordCountRef.current(false);
                    }
                  }}
                  extraClasses='!px-3'
                >
                  <>{word}</>
                </ChipContainer>
              ))}
            </div>
          </div>
        </SelectWordsModal>
      )}
      {gameState.started && gameState.preTurn && !displayGuessedWord && (
        <ScoreBoardModal forbidClose>
          <div>
            <div>
              <div className='flex items-center justify-between mb-6 '>
                <h1 className='text-lg font-bold text-teal-900'>
                  Ronda terminada! La palabra era{' '}
                  <span className='text-xl text-teal-600'>
                    {gameState.currentWord}
                  </span>
                </h1>
                <div className='font-bold text-teal-600'>
                  {scoreBoardCounter}
                </div>
              </div>
            </div>
            <h1 className='mb-4 text-xl font-bold text-teal-900 underline underline-offset-2 decoration-teal-700'>
              Puntuaciones:
            </h1>
            <UserList />
          </div>
        </ScoreBoardModal>
      )}
      {gameState.started && gameState.preTurn && !displayGuessedWord && (
        <EndGameModal forbidClose>
          <div>
            <h1 className='mb-4 text-xl font-bold text-teal-800'>
              Puntuación final:
            </h1>
            <UserList />
          </div>
        </EndGameModal>
      )}
      {displayGuessedWord && <GuessedWord msg={guessedMsgDisplayed} />}
    </>
  );
};
