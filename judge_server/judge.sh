#!/usr/bin/env sh

name=`jq -r .sourceName ./source/config.json`
extension=`jq -r .extension ./source/config.json`
inputNum=`jq -r .testSetSize ./source/config.json`

mkdir tmp

if [ ${extension} = 'cpp' ]; then
	cd ./source
	ret=`file ${name}`
	if test "${ret#*text}" != "$ret"; then
		g++ -o ../a.out -w -O3 -std=c++14 ${name} 2> ../tmp/compile_error.log
	else
		echo "It's not a source code" > ../tmp/compile_error.log
	fi
	cd ..

	if [ -f a.out ]; then
		for i in $(seq 1 ${inputNum}); do
			timeout 1 ./a.out < ./input/${i}.in > ./tmp/output.log 2> ./tmp/error.log

			./compare.py ./tmp/output.log ./answer/${i}.out ${i} $? ./tmp/error.log

			if [ $? -ne 0 ]; then
				break
			fi
		done
	else
		cp ./tmp/compile_error.log ./output/compile_error.log
	fi

elif [ ${extension} = 'java' ]; then
	cd ./source
	ret=`file ${name}`
	if test "${ret#*text}" != "$ret"; then
		javac -encoding UTF-8 ${name} -d ../ 2> ../tmp/compile_error.log
	else
		echo "It's not a source code" > ../tmp/error.log
	fi
	cd ..

	if [ -f "${name%.java}.class" ]; then
		for i in $(seq 1 ${inputNum}); do
			timeout 3 java ${name%.java} < ./input/${i}.in > ./tmp/output.log 2> ./tmp/error.log

			./compare.py ./tmp/output.log ./answer/${i}.out ${i} $? ./tmp/error.log

			if [ $? -ne 0 ]; then
				break
			fi
		done
	else
		# fail to compile
		if [ -s ./tmp/compile_error.log ]; then
			cp ./tmp/compile_error.log ./output/compile_error.log

		# another error
		else
			# can not find class
			if ! [ -s ./tmp/error.log ]; then
				echo "Can not find ${name%.java} class.
You must remove the package definition from the source code." > ./tmp/error.log
			fi

			cp ./tmp/error.log ./output/error.log
		fi
	fi
fi