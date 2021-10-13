import os
import sys
import gzip
from io import BytesIO
import json
import hashlib
import shutil
import requests
import tarfile
import urllib3
urllib3.disable_warnings()

# Get Docker token (this function is useless for unauthenticated registries like Microsoft)
def get_auth_head(type, auth_url, reg_service, repository):
	resp = requests.get('{}?service={}&scope=repository:{}:pull'.format(auth_url, reg_service, repository), verify=False)
	access_token = resp.json()['token']
	auth_head = {'Authorization':'Bearer '+ access_token, 'Accept': type}
	return auth_head

# Docker style progress bar
def progress_bar(ublob, nb_traits):
	sys.stdout.write('\r' + ublob[7:19] + ': Downloading [')
	for i in range(0, nb_traits):
		if i == nb_traits - 1:
			sys.stdout.write('>')
		else:
			sys.stdout.write('=')
	for i in range(0, 49 - nb_traits):
		sys.stdout.write(' ')
	sys.stdout.write(']')
	sys.stdout.flush()

# Fetch manifest v2 and get image layer digests
def get_image_layers(full_registry_name):
	# Look for the Docker image to download
	repo = 'library'
	tag = 'latest'
	imgparts = full_registry_name.split('/')
	try:
		img,tag = imgparts[-1].split('@')
	except ValueError:
		try:
			img,tag = imgparts[-1].split(':')
		except ValueError:
			img = imgparts[-1]
	# Docker client doesn't seem to consider the first element as a potential registry unless there is a '.' or ':'
	if len(imgparts) > 1 and ('.' in imgparts[0] or ':' in imgparts[0]):
		registry = imgparts[0]
		repo = '/'.join(imgparts[1:-1])
	else:
		registry = 'registry-1.docker.io'
		if len(imgparts[:-1]) != 0:
			repo = '/'.join(imgparts[:-1])
		else:
			repo = 'library'
	repository = '{}/{}'.format(repo, img)

	# Get Docker authentication endpoint when it is required
	auth_url='https://auth.docker.io/token'
	reg_service='registry.docker.io'
	resp = requests.get('https://{}/v2/'.format(registry), verify=False)
	if resp.status_code == 401:
		auth_url = resp.headers['WWW-Authenticate'].split('"')[1]
		try:
			reg_service = resp.headers['WWW-Authenticate'].split('"')[3]
		except IndexError:
			reg_service = ""	
	auth_head = get_auth_head('application/vnd.docker.distribution.manifest.v2+json', auth_url, reg_service, repository)
	resp = requests.get('https://{}/v2/{}/manifests/{}'.format(registry, repository, tag), headers=auth_head, verify=False)
	if (resp.status_code != 200):
		print(('[-] Cannot fetch manifest for {} [HTTP {}]'.format(repository, resp.status_code)))
		print((resp.content))
		auth_head = get_auth_head('application/vnd.docker.distribution.manifest.list.v2+json', auth_url, reg_service, repository)
		resp = requests.get('https://{}/v2/{}/manifests/{}'.format(registry, repository, tag), headers=auth_head, verify=False)
		if (resp.status_code == 200):
			print('[+] Manifests found for this tag (use the @digest format to pull the corresponding image):')
			manifests = resp.json()['manifests']
			for manifest in manifests:
				for key, value in list(manifest["platform"].items()):
						sys.stdout.write('{}: {}, '.format(key, value))
				print(('digest: {}'.format(manifest["digest"])))
		exit(1)
	layers = resp.json()['layers']

	# Create tmp folder that will hold the image
	imgdir = 'tmp_{}_{}'.format(img, tag.replace(':', '@'))
	os.mkdir(imgdir)
	print(('Creating image structure in: ' + imgdir))

	config = resp.json()['config']['digest']
	confresp = requests.get('https://{}/v2/{}/blobs/{}'.format(registry, repository, config), headers=auth_head, verify=False)
	file = open('{}/{}.json'.format(imgdir, config[7:]), 'wb')
	file.write(confresp.content)
	file.close()

	content = [{
		'Config': config[7:] + '.json',
		'RepoTags': [ ],
		'Layers': [ ]
		}]
	if len(imgparts[:-1]) != 0:
		content[0]['RepoTags'].append('/'.join(imgparts[:-1]) + '/' + img + ':' + tag)
	else:
		content[0]['RepoTags'].append(img + ':' + tag)

	empty_json = '{"created":"1970-01-01T00:00:00Z","container_config":{"Hostname":"","Domainname":"","User":"","AttachStdin":false, \
	"AttachStdout":false,"AttachStderr":false,"Tty":false,"OpenStdin":false, "StdinOnce":false,"Env":null,"Cmd":null,"Image":"", \
	"Volumes":null,"WorkingDir":"","Entrypoint":null,"OnBuild":null,"Labels":null}}'

	# Build layer folders
	parentid=''
	for layer in layers:
		ublob = layer['digest']
		# FIXME: Creating fake layer ID. Don't know how Docker generates it
		fake_layerid = hashlib.sha256((parentid+'\n'+ublob+'\n').encode('utf-8')).hexdigest()
		layerdir = imgdir + '/' + fake_layerid
		os.mkdir(layerdir)

		# Creating VERSION file
		file = open(layerdir + '/VERSION', 'w')
		file.write('1.0')
		file.close()

		# Creating layer.tar file
		sys.stdout.write(ublob[7:19] + ': Downloading...')
		sys.stdout.flush()
		auth_head = get_auth_head('application/vnd.docker.distribution.manifest.v2+json', auth_url, reg_service, repository) # refreshing token to avoid its expiration
		bresp = requests.get('https://{}/v2/{}/blobs/{}'.format(registry, repository, ublob), headers=auth_head, stream=True, verify=False)
		if (bresp.status_code != 200): # When the layer is located at a custom URL
			bresp = requests.get(layer['urls'][0], headers=auth_head, stream=True, verify=False)
			if (bresp.status_code != 200):
				print(('\rERROR: Cannot download layer {} [HTTP {}]'.format(ublob[7:19], bresp.status_code, bresp.headers['Content-Length'])))
				print((bresp.content))
				exit(1)
	# Stream download and follow the progress
		bresp.raise_for_status()
		unit = int(bresp.headers['Content-Length']) / 50
		acc = 0
		nb_traits = 0
		progress_bar(ublob, nb_traits)
		with open(layerdir + '/layer_gzip.tar', "wb") as file:
			for chunk in bresp.iter_content(chunk_size=8192): 
				if chunk:
					file.write(chunk)
					acc = acc + 8192
					if acc > unit:
						nb_traits = nb_traits + 1
						progress_bar(ublob, nb_traits)
						acc = 0
		sys.stdout.write("\r{}: Extracting...{}".format(ublob[7:19], " "*50)) # Ugly but works everywhere
		sys.stdout.flush()
		with open(layerdir + '/layer.tar', "wb") as file: # Decompress gzip response
			unzLayer = gzip.open(layerdir + '/layer_gzip.tar','rb')
			shutil.copyfileobj(unzLayer, file)
			unzLayer.close()
		os.remove(layerdir + '/layer_gzip.tar')
		print(("\r{}: Pull complete [{}]".format(ublob[7:19], bresp.headers['Content-Length'])))
		content[0]['Layers'].append(fake_layerid + '/layer.tar')
	
		# Creating json file
		file = open(layerdir + '/json', 'w')
		# last layer = config manifest - history - rootfs
		if layers[-1]['digest'] == layer['digest']:
			# FIXME: json.loads() automatically converts to unicode, thus decoding values whereas Docker doesn't
			json_obj = json.loads(confresp.content.decode('utf-8'))
			del json_obj['history']
			try:
				del json_obj['rootfs']
			except: # Because Microsoft loves case insensitiveness
				del json_obj['rootfS']
		else: # other layers json are empty
			json_obj = json.loads(empty_json)
		json_obj['id'] = fake_layerid
		if parentid:
			json_obj['parent'] = parentid
		parentid = json_obj['id']
		file.write(json.dumps(json_obj))
		file.close()

	file = open(imgdir + '/manifest.json', 'w')
	file.write(json.dumps(content))
	file.close()

	if len(imgparts[:-1]) != 0:
		content = { '/'.join(imgparts[:-1]) + '/' + img : { tag : fake_layerid } }
	else: # when pulling only an img (without repo and registry)
		content = { img : { tag : fake_layerid } }
	file = open(imgdir + '/repositories', 'w')
	file.write(json.dumps(content))
	file.close()

	# Create image tar and clean tmp folder
	docker_tar = repo.replace('/', '_') + '_' + img + '.tar'
	sys.stdout.write("Creating archive...")
	sys.stdout.flush()
	tar = tarfile.open(docker_tar, "w")
	tar.add(imgdir, arcname=os.path.sep)
	tar.close()
	shutil.move(docker_tar, '/tmp/'+ docker_tar)
	shutil.rmtree(imgdir)
	print('\rDocker image pulled: ' + docker_tar)

#if __name__ == "__main__":
#	if len(sys.argv) != 2 :
#		print('Usage:\n\tdocker_pull.py [registry/][repository/]image[:tag|@digest]\n')
#		exit(1)
#	get_image_layers(sys.argv[1])


