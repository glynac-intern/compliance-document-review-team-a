"""
Tests for TA-24: the 10MB cap must be enforced WHILE STREAMING, not
after the whole file is buffered. Reading must stop once the cap is
exceeded, not continue draining the rest of an oversized upload.
"""
import sys

sys.path.insert(0, "/app")

from documents.router import _read_upload_with_cap, MAX_FILE_SIZE


class _FakeUploadFile:
    """Wraps a plain file-like object the way FastAPI's UploadFile does
    (exposes .file), so _read_upload_with_cap can be tested directly."""
    def __init__(self, file_obj):
        self.file = file_obj


class _InfiniteStream:
    """
    Simulates an arbitrarily large (functionally infinite) upload
    stream, and tracks exactly how many bytes were ever requested from
    it. If _read_upload_with_cap genuinely stops early, bytes_served
    stays small (bounded near MAX_FILE_SIZE). A naive "read it all
    first" implementation would never even return with a stream like
    this -- it would hang or OOM -- so completing at all, with a small
    bytes_served count, is real proof of early termination.
    """
    def __init__(self):
        self.bytes_served = 0

    def read(self, size):
        self.bytes_served += size
        return b"x" * size


def test_reading_stops_once_cap_exceeded_not_after_full_buffer():
    stream = _InfiniteStream()
    fake_file = _FakeUploadFile(stream)

    try:
        _read_upload_with_cap(fake_file)
        assert False, "expected the cap to be exceeded and raise"
    except Exception as e:
        assert "10MB" in str(e) or "exceeds" in str(e).lower() or hasattr(e, "detail")

    # The real proof: we never asked the (functionally infinite) stream
    # for anywhere close to "all of it" -- only a little more than the
    # cap itself, since we stopped requesting more chunks the moment
    # the running total crossed MAX_FILE_SIZE.
    assert stream.bytes_served <= MAX_FILE_SIZE + (1024 * 1024), (
        f"expected reading to stop shortly after the cap, but "
        f"{stream.bytes_served} bytes were requested from the stream -- "
        f"this suggests the whole file is still being buffered first"
    )


def test_file_exactly_at_the_limit_succeeds():
    import io
    exact_size_content = b"x" * MAX_FILE_SIZE
    fake_file = _FakeUploadFile(io.BytesIO(exact_size_content))

    result = _read_upload_with_cap(fake_file)
    assert len(result) == MAX_FILE_SIZE


def test_file_one_byte_over_the_limit_is_rejected():
    import io
    over_by_one = b"x" * (MAX_FILE_SIZE + 1)
    fake_file = _FakeUploadFile(io.BytesIO(over_by_one))

    try:
        _read_upload_with_cap(fake_file)
        assert False, "expected rejection for a file one byte over the limit"
    except Exception as e:
        assert hasattr(e, "status_code") and e.status_code == 400
