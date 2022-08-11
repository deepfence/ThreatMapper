import React from 'react';
import ReactModal from 'react-modal';
import { hideModal} from '../../../actions/app-actions';

const modalStyles = {
  content: {
    backgroundColor: '#222222',
    margin: 'auto',
    padding: '0px',
    border: '1px solid #252525',
    overflow: 'initial',
    overflowY: 'auto',
    top: '50%',
    left: '50%',
    bottom: 'auto',
    right: 'auto',
    transform: 'translate(-50%, -50%)',
  },
  overlay: {
    backgroundColor: 'rgba(16, 16, 16, 0.8)',
    zIndex: 100,
  }
};

export default class GenericModal extends React.PureComponent {
  constructor(props) {
    super(props);
    this.handleHideModal = this.handleHideModal.bind(this);
  }

  handleHideModal() {
    const {dispatch, modalProps: {onHide} = {}} = this.props;
    dispatch(hideModal());
    if (onHide) {
      onHide();
    }
  }

  render() {
    const {
      showModal,
      modalProps: {
        title,
        contentStyles,
        overLayStyles,
        modalContent,
        modalContentProps,
        showClosebutton,
      }
    } = this.props;
    const modalStylesOverride = {
      content: {
        ...modalStyles.content,
        ...contentStyles
      },
      overlay: {
        ...modalStyles.overlay,
        ...overLayStyles
      }
    };
    return (
      <div>
        <ReactModal
          isOpen={showModal}
          onRequestClose={this.handleHideModal}
          style={modalStylesOverride}
          ariaHideApp={false}
        >
          <div className="df-generic-modal">
            <div className="modal-header">
              <span className="title">
                {title}
              </span>
              <i
                className="fa fa-close modal-close"
                onClick={this.handleHideModal}
                aria-hidden="true"
              />
            </div>
            <div className="modal-body">
              {modalContent(modalContentProps)}
            </div>
            {showClosebutton && (
            <button
              className="primary-btn"
              type="submit"
              style={{margin: '10px 45px 10px', padding: '5px'}}
              onClick={this.handleHideModal}
               >
              Done
            </button>
            )}
          </div>
        </ReactModal>
      </div>
    );
  }
}
