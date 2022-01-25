pipeline
{
    agent
    {
        kubernetes
        {
            containerTemplate
            {
                name 'kiso-build-env'
                image 'eclipse/kiso-build-env:v0.1.1'
                alwaysPullImage 'true'
                ttyEnabled true
                resourceRequestCpu '2'
                resourceLimitCpu '2'
                resourceRequestMemory '8Gi'
                resourceLimitMemory '8Gi'
            }
        }
    }
    stages
    {
        stage('Setup Env')
        {
            steps
            {
                // Clean workspace
                cleanWs()
                checkout scm
            }
        }

        stage('Run unittests')
        {
            steps
            {
                sh """
                npm install
                xvfb-run -a npm run test
                """
            }
        }

        stage('build plugin')
        {
            steps
            {
                sh """
                npm install
                vsce package --baseContentUrl https://github.com/eclipse/kiso-testing-vscode.git
                """

            }
        }

        stage('publish')
        {
            when
            {
                buildingTag()
            }
            steps
            {
                withCredentials([string(
                                credentialsId: 'vscode-marketplace-token',
                                variable: 'token')]) {

                    sh """
                    export VSCE_PAT=${token}
                    vsce publish --baseContentUrl https://github.com/eclipse/kiso-testing-vscode.git
                    """
                }
            }
        }


    } // stages

    post // Called at very end of the script to notify developer and github about the result of the build
    {
        // always
        // {
        //     // pass
        // }
        success
        {
            cleanWs()
        }
        unstable
        {
            notifyFailed()
        }
        failure
        {
            notifyFailed()
        }
        aborted
        {
            notifyAbort()
        }
    }
} // pipeline


def notifyFailed()
{
    emailext (subject: "Job '${env.JOB_NAME}' (${env.BUILD_NUMBER}) is failing",
                body: "Oups, something went wrong with ${env.BUILD_URL}... We are looking forward for your fix!",
                recipientProviders: [[$class: 'CulpritsRecipientProvider'],
                                    [$class: 'DevelopersRecipientProvider'],
                                    [$class: 'RequesterRecipientProvider']])
}

def notifyAbort()
{
    emailext (subject: "Job '${env.JOB_NAME}' (${env.BUILD_NUMBER}) was aborted",
                body: "Oups, something went wrong with ${env.BUILD_URL}... We are looking forward for your fix!",
                recipientProviders: [[$class: 'CulpritsRecipientProvider'],
                                    [$class: 'DevelopersRecipientProvider'],
                                    [$class: 'RequesterRecipientProvider']])
}
