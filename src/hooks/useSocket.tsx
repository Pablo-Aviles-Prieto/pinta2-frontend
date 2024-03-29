import { FC, createContext, useContext, useState } from 'react';
import { Socket } from 'socket.io-client';
import { DefaultEventsMap } from '@socket.io/component-emitter';
import { useGameData } from './useGameData';
import {
  DEFAULT_CATEGORY_SELECTED,
  DEFAULT_INIT_GAME_STATE,
  DEFAULT_TURN_DURATION,
} from '../utils/const';

interface SocketContextI {
  socket: Socket<DefaultEventsMap, DefaultEventsMap> | null;
  setSocket: React.Dispatch<
    React.SetStateAction<Socket<DefaultEventsMap, DefaultEventsMap> | null>
  >;
  username: string;
  setUsername: React.Dispatch<React.SetStateAction<string>>;
  joinedRoom: number | undefined;
  setJoinedRoom: React.Dispatch<React.SetStateAction<number | undefined>>;
  isRegistered: boolean;
  setIsRegistered: React.Dispatch<React.SetStateAction<boolean>>;
  roomPassword: string;
  setRoomPassword: React.Dispatch<React.SetStateAction<string>>;
  resetSocketAndGameData: () => void;
}

interface PropsI {
  children: JSX.Element;
}

const SocketContext = createContext<SocketContextI | undefined>(undefined);

export const SocketProvider: FC<PropsI> = ({ children }) => {
  const [username, setUsername] = useState('');
  const [roomPassword, setRoomPassword] = useState<string>('');
  const [joinedRoom, setJoinedRoom] = useState<number | undefined>(undefined);
  const [socket, setSocket] = useState<Socket<
    DefaultEventsMap,
    DefaultEventsMap
  > | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const {
    setUserList,
    setGameState,
    setCategorySelected,
    setTurnDuration,
    setIsDrawer,
    setIsPlaying,
    setUsersNotPlaying,
  } = useGameData();

  const resetSocketAndGameData = () => {
    socket?.disconnect();
    // socket setters
    setUsername('');
    setRoomPassword('');
    setJoinedRoom(undefined);
    setSocket(null);
    setIsRegistered(false);
    // useGameData setters
    setUserList([]);
    setGameState(DEFAULT_INIT_GAME_STATE);
    setCategorySelected(DEFAULT_CATEGORY_SELECTED);
    setTurnDuration(DEFAULT_TURN_DURATION);
    setIsDrawer(false);
    setIsPlaying(false);
    setUsersNotPlaying([]);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        setSocket,
        username,
        setUsername,
        joinedRoom,
        setJoinedRoom,
        isRegistered,
        setIsRegistered,
        roomPassword,
        setRoomPassword,
        resetSocketAndGameData,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
