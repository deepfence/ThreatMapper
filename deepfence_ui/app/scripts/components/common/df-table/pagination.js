/* eslint-disable react/destructuring-assignment */
import React from 'react';
import ReactPaginate from 'react-paginate';

export default class PaginationComponent extends React.PureComponent {
  constructor(props) {
    super(props);
    this.onPageChange = this.onPageChange.bind(this);
  }

  onPageChange(data) {
    this.props.onPageChange(data.selected);
  }

  render() {
    const {
      pages, page, defaultPageSize, manual
    } = this.props;
    let totalPages = pages;
    if (manual) {
      totalPages = Math.ceil(pages / defaultPageSize);
    }
    return (
      <ReactPaginate
        previousLabel="Previous"
        nextLabel="Next"
        pageCount={totalPages}
        marginPagesDisplayed={2}
        pageRangeDisplayed={2}
        onPageChange={this.onPageChange}
        forcePage={page}
      />
    );
  }
}
