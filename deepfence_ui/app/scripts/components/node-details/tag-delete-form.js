import React from 'react';
import classnames from 'classnames';
import {Map} from 'immutable';
import {reduxForm, Field} from 'redux-form/immutable';
import Loader from '../common/app-loader/horizontal-dots-loader';

const renderTagGroupField = ({
  input,
  options,
}) => {
  const {onChange} = input;
  const selectedTagList = input.value;

  const boxes = options.map((tag) => {
    const selected = selectedTagList.includes(tag);
    const boxClassname = classnames({
      tag: true,
      active: selected,
    });
    return (
      <div
        className={boxClassname}
        onClick={() => {
          const arr = [...selectedTagList];
          if (selectedTagList.includes(tag)) {
            arr.splice(arr.indexOf(tag), 1);
          } else {
            arr.push(tag);
          }
          return onChange(arr);
        }}
        aria-hidden="true"
        key={tag}
      >
        {tag}
      </div>
    );
  });

  return (
    <div>
      <div>
        {boxes}
      </div>
    </div>
  );
};

class TagDeleteForm extends React.PureComponent {
  constructor(props) {
    super(props);
    this.submitClickHandler = this.submitClickHandler.bind(this);
  }

  submitClickHandler(values) {
    const {
      handleSubmit,
      reset,
    } = this.props;
    return handleSubmit(values).then(() => reset());
  }

  render() {
    const {
      tags,
      submitting,
      pristine,
    } = this.props;
    return (
      <div className="df-modal-form">
        <form onSubmit={this.submitClickHandler}>
          <div className="form-field">
            <Field
              name="tags"
              component={renderTagGroupField}
              options={tags}
            />
          </div>
          <div className="form-field">
            <button
              className="primary-btn full-width relative"
              type="submit"
              disabled={submitting || pristine}
             >
              Delete tags
              {submitting && <Loader style={{ left: '90%', top: '-136%'}} />}
            </button>
          </div>
        </form>
      </div>
    );
  }
}

export default reduxForm({
  form: 'tag-delete',
  initialValues: Map({
    tags: [],
  }),
})(TagDeleteForm);
