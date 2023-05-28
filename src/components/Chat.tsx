import React, { FC, useEffect, useRef, useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { ChatMsgsI } from '../interfaces';
import { Send } from './Icons';

interface PropsI {
  joinedRoom: number | undefined;
}

export const Chat: FC<PropsI> = ({ joinedRoom }) => {
  const [message, setMessage] = useState('');
  const [chatMsgs, setChatMsgs] = useState<ChatMsgsI[]>([]);
  const lastMsgRef = useRef<HTMLLIElement | null>(null);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    function onChatMsg(msgContent: ChatMsgsI) {
      setChatMsgs((previous) => [...previous, msgContent]);
    }

    socket?.on('chat msg', onChatMsg);

    return () => {
      socket?.off('chat msg', onChatMsg);
    };
  }, []);

  useEffect(() => {
    lastMsgRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMsgs]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    // TODO: send the minute of the current turn aswell
    socket?.emit('chat msg', { msg: message.trim(), roomNumber: joinedRoom });
    setMessage('');
  }

  return (
    <div className='flex flex-col justify-between w-full h-full'>
      <div className='flex flex-col-reverse h-[93%]'>
        <ul className='overflow-y-auto'>
          {chatMsgs.map((event, index) => (
            <li
              key={index}
              className='break-words'
              ref={index === chatMsgs.length - 1 ? lastMsgRef : null}
            >
              <span className='font-bold'>{event.user}</span>: {event.msg}
            </li>
          ))}
        </ul>
        <div />
      </div>
      <form
        onSubmit={onSubmit}
        className='flex w-full py-1 border-t-2 border-gray-700'
      >
        <input
          placeholder='Type a message...'
          onChange={(e) => setMessage(e.target.value)}
          value={message}
          className='w-full px-2 outline-none focus:outline-none ring-0 focus:ring-0'
        />
        <button type='submit'>
          <Send width={30} height={30} className='text-cyan-300' />
        </button>
      </form>
    </div>
  );
};