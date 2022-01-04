import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { showModal, hideModal } from '../../actions/app-actions';

export const useDOMSize = (element) => {
  const [width, setWidth] = useState(element?.offsetWidth);
  const [height, setHeight] = useState(element?.offsetHeight);

  useEffect(() => {
    if (element === null) {
      return;
    }

    setWidth(element.offsetWidth);
    setHeight(element.offsetHeight);

    const obs = new ResizeObserver(() => {
      setWidth(element.offsetWidth);
      setHeight(element.offsetHeight);
    });
    obs.observe(element);

    return () => {
      obs.disconnect();
    };
  }, [element]);

  return [width, height];
};

export const useVisibilityState = () => {
  const [visible, setVisible] = useState(
    document.visibilityState === "visible"
  );

  useEffect(() => {
    const cb = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", cb);
    return () => {
      document.removeEventListener("visibilitychange", cb);
    };
  }, [setVisible]);

  return visible;
};


export function useSocketDisconnectHandler() {
  const dispatch = useDispatch();
  const [modalShown, setModalShown] = useState(false);
  const trigger = useCallback(() => {
    if (!modalShown) setModalShown(true);
  }, []);

  useEffect(() => {
    if (modalShown) {
      dispatch(showModal('GENERIC_MODAL', {
        title: 'Connection timed out',
        modalContent: () => (
          <>
            <div>
              Connection timed out, please reload the window.
            </div>
            <div style={{ display: "flex", justifyContent: 'flex-end' }}>
              <button
                className="primary-btn"
                type="submit"
                style={{ marginTop: '30px', marginLeft: 'auto', marginRight: 0 }}
                onClick={() => {
                  window.location.reload();
                }}
              >
                Reload
              </button>
            </div>
          </>
        ),
        onHide: () => {
          setModalShown(false);
        }
      }));
    }
  }, [modalShown]);

  useEffect(() => () => {
    dispatch(hideModal());
  }, [])

  return trigger;
}
