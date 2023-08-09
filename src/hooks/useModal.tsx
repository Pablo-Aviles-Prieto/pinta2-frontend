import { useState, useCallback, FC } from 'react';
import { CloseSquare } from '../components/Icons';

interface ModalI {
  isOpen: boolean;
  onClose: () => void;
  children?: JSX.Element;
  content?: JSX.Element;
  forbidClose?: boolean;
  extraClasses?: string;
}

const Modal: FC<ModalI> = ({
  isOpen,
  children,
  onClose,
  content,
  forbidClose = false,
  extraClasses = undefined,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      onClick={forbidClose ? undefined : onClose}
      className='z-40 fixed inset-0 flex items-center justify-center bg-black backdrop-blur-[2px] bg-opacity-70'
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-[600px] bg-white p-5 rounded-lg ${extraClasses}`}
      >
        <>
          {content && content}
          {children}
        </>
        {!forbidClose && (
          <button onClick={onClose} className='absolute top-2 right-2'>
            <CloseSquare
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              width={35}
              height={35}
              className='text-teal-800 hover:text-teal-600'
              filled={isHovered}
            />
          </button>
        )}
      </div>
    </div>
  );
};

// Create another function that handles the JSX and set as children ??
export function useModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<JSX.Element | undefined>(undefined);

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);

  const RenderModal = ({
    children,
    forbidClose = false,
    extraClasses = undefined,
  }: {
    children?: JSX.Element;
    forbidClose?: boolean;
    extraClasses?: string;
  }) => (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      content={content}
      forbidClose={forbidClose}
      extraClasses={extraClasses}
    >
      {children && children}
    </Modal>
  );

  return { openModal, closeModal, RenderModal, setContent };
}
