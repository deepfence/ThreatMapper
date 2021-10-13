import tarfile
from io import BytesIO


def archive(filesobj):
    archive_content = BytesIO()
    archive_file = tarfile.open(fileobj=archive_content, mode='w:gz')
    for name, content_bytes in filesobj.items():
        content = BytesIO(content_bytes)
        tinfo = tarfile.TarInfo(name=name)
        tinfo.size = content.getbuffer().nbytes
        archive_file.addfile(tarinfo=tinfo, fileobj=content)
    archive_file.close()
    return archive_content


def extract_archive(archivefile):
    filesobj = {}
    archive_content = BytesIO(archivefile)
    archive_file = tarfile.open(fileobj=archive_content, mode='r:gz')
    for tinfo in archive_file.getmembers():
        fileobj = archive_file.extractfile(tinfo)
        filesobj[tinfo.name] = fileobj
    return filesobj
